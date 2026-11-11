import * as crypto from "node:crypto";

function getStorageConfig() {
  return {
    clientEmail: process.env.GOOGLE_CLIENT_EMAIL,
    privateKey: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    defaultFolderId: process.env.GOOGLE_DRIVE_FOLDER_ID,
    webhookUrl1: process.env.GOOGLE_DRIVE_WEBHOOK_URL || undefined,
    webhookUrl2: process.env.GOOGLE_DRIVE_WEBHOOK_URL_2 || undefined,
  };
}

export interface DriveUploadOptions {
  fileName: string;
  mimeType: string;
  buffer: Buffer;
  folderId?: string;
  isPublic?: boolean;
  targetKho?: "kho1" | "kho2" | "auto";
}

export interface DriveUploadResult {
  fileId: string;
  name: string;
  viewUrl: string;
  downloadUrl: string;
  thumbnailUrl?: string;
  storageWarehouse?: string;
  md5Checksum?: string;
  headRevisionId?: string;
  sizeBytes?: number;
}

/**
 * Tạo Google Drive OAuth2 Access Token bằng Service Account JWT (RS256) hoặc OAuth Refresh Token
 */
export async function getDriveAccessToken(): Promise<string | null> {
  // Ưu tiên 1: OAuth2 Refresh Token nếu có
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (clientId && clientSecret && refreshToken) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          grant_type: "refresh_token",
        }),
        signal: controller.signal,
      }).finally(() => clearTimeout(timeout));

      if (tokenRes.ok) {
        const tokenData = await tokenRes.json();
        if (tokenData?.access_token) return tokenData.access_token;
      }
    } catch {
      // Fallback sang Service Account JWT bên dưới
    }
  }

  // Ưu tiên 2: Service Account JWT
  const { clientEmail, privateKey } = getStorageConfig();
  if (!clientEmail || !privateKey) {
    console.warn("⚠️ [GoogleDrive] Chưa cấu hình GOOGLE_CLIENT_EMAIL hoặc GOOGLE_PRIVATE_KEY.");
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/drive",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const base64Url = (obj: any) =>
    Buffer.from(JSON.stringify(obj))
      .toString("base64")
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");

  const unsignedToken = `${base64Url(header)}.${base64Url(claim)}`;

  const sign = crypto.createSign("RSA-SHA256");
  sign.update(unsignedToken);
  const signature = sign
    .sign(privateKey, "base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  const jwt = `${unsignedToken}.${signature}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt,
      }),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    if (!res.ok) {
      const errText = await res.text();
      console.error("❌ [GoogleDrive] Lỗi lấy Access Token:", errText);
      return null;
    }

    const data = await res.json();
    return data.access_token;
  } catch (error) {
    console.error("❌ [GoogleDrive] Lỗi mạng khi xác thực OAuth2:", error);
    return null;
  }
}

/**
 * Thu hồi mọi quyền chia sẻ công khai ('anyone' hoặc 'domain') trên tệp bằng chứng nhạy cảm.
 * Cơ chế Fail-Closed:
 * - Bắt buộc có accessToken và fileId hợp lệ.
 * - Nếu gọi API danh sách permissions thất bại hoặc xóa quyền anyone/domain bị từ chối (ví dụ: HTTP 403 do kế thừa từ thư mục cha),
 *   lập tức ném lỗi (và cố gắng thu hồi/cô lập tệp) để tuyệt đối KHÔNG cấp chứng từ SEAL cho tệp còn public.
 * - Sau khi xóa, truy vấn lại danh sách permissions để xác minh ACL cuối cùng không còn bất kỳ principal 'anyone' hay 'domain' nào.
 */
export async function ensureDriveFilePrivate(
  fileId: string,
  customToken?: string
): Promise<{ verifiedPrivate: true; remainingPrincipalTypes: string[] }> {
  if (!fileId || typeof fileId !== "string" || !fileId.trim()) {
    throw new Error("DRIVE_PRIVACY_ERROR: Thiếu mã tệp (fileId) cần khóa quyền riêng tư.");
  }
  const token = customToken || (await getDriveAccessToken());
  if (!token) {
    throw new Error("DRIVE_PRIVACY_ERROR: Không có Access Token để xác minh và khóa quyền riêng tư trên Google Drive.");
  }

  const encodedFileId = encodeURIComponent(fileId.trim());
  const permUrl = `https://www.googleapis.com/drive/v3/files/${encodedFileId}/permissions?supportsAllDrives=true&fields=permissions(id,type,role,domain,inherited,permissionDetails)`;

  const listRes = await fetch(permUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!listRes.ok) {
    throw new Error(
      `DRIVE_PRIVACY_ERROR: Không thể kiểm tra danh sách quyền (ACL) của tệp Google Drive (HTTP ${listRes.status}).`
    );
  }

  const data = await listRes.json();
  const perms: Array<Record<string, any>> = Array.isArray(data?.permissions) ? data.permissions : [];

  const forbiddenPerms = perms.filter(
    (p) => p?.type === "anyone" || p?.type === "domain"
  );

  for (const p of forbiddenPerms) {
    const permId = typeof p?.id === "string" ? p.id.trim() : "";
    if (!permId) {
      throw new Error(
        `DRIVE_PRIVACY_ERROR: Phát hiện quyền chia sẻ rộng (${String(p?.type)}) nhưng không có permissionId để thu hồi.`
      );
    }

    const delRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${encodedFileId}/permissions/${encodeURIComponent(permId)}?supportsAllDrives=true`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!delRes.ok && delRes.status !== 204) {
      // Cố gắng xóa/cô lập tệp vừa tạo nếu không thể thu hồi quyền public (ví dụ: kế thừa từ folder public)
      await fetch(
        `https://www.googleapis.com/drive/v3/files/${encodedFileId}?supportsAllDrives=true`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      ).catch(() => null);

      throw new Error(
        `DRIVE_PRIVACY_ERROR: Google Drive từ chối thu hồi quyền chia sẻ '${String(p?.type)}' (HTTP ${delRes.status}). Tệp đã bị từ chối nghiệm thu.`
      );
    }
  }

  // Kiểm tra lại ACL sau khi thu hồi để đảm bảo không còn quyền kế thừa (inherited) hoặc quyền công khai nào sót lại
  const verifyRes = await fetch(permUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!verifyRes.ok) {
    throw new Error(
      `DRIVE_PRIVACY_ERROR: Không thể xác minh lại ACL sau khi thu hồi quyền công khai (HTTP ${verifyRes.status}).`
    );
  }

  const verifyData = await verifyRes.json();
  const finalPerms: Array<Record<string, any>> = Array.isArray(verifyData?.permissions)
    ? verifyData.permissions
    : [];

  const stillExposed = finalPerms.some(
    (p) => p?.type === "anyone" || p?.type === "domain"
  );
  if (stillExposed) {
    await fetch(
      `https://www.googleapis.com/drive/v3/files/${encodedFileId}?supportsAllDrives=true`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      }
    ).catch(() => null);

    throw new Error(
      "DRIVE_PRIVACY_ERROR: Tệp Google Drive vẫn còn quyền truy cập công khai/domain (có thể do kế thừa từ thư mục cha). Đã từ chối nghiệm thu."
    );
  }

  return {
    verifiedPrivate: true,
    remainingPrincipalTypes: finalPerms.map((p) => String(p?.type || "unknown")),
  };
}

/**
 * Tải tệp (ảnh, video, bản sao lưu) lên Kho Lưu Trữ Google Drive.
 * Mặc định isPublic = false để bảo vệ bằng chứng nhạy cảm (không tự động mở anyone/reader).
 */
export async function uploadToGoogleDrive(
  options: DriveUploadOptions
): Promise<DriveUploadResult | null> {
  const config = getStorageConfig();
  const targetKho = options.targetKho || "auto";
  const shouldBePublic = options.isPublic === true;
  const sha256Checksum = crypto.createHash("sha256").update(options.buffer).digest("hex");

  // 🌟 Ưu tiên 1: Service Account / OAuth2 REST API (giữ quyền kiểm soát ACL trực tiếp, không mở public cho bằng chứng)
  const token = await getDriveAccessToken();
  if (token) {
    const targetFolder = options.folderId || config.defaultFolderId;
    const metadata: Record<string, any> = {
      name: options.fileName,
      mimeType: options.mimeType,
    };

    if (targetFolder) {
      metadata.parents = [targetFolder];
    }

    const boundary = `-------cloop_drive_boundary_${Date.now()}`;
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const multipartBody = Buffer.concat([
      Buffer.from(
        delimiter +
          "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
          JSON.stringify(metadata) +
          delimiter +
          `Content-Type: ${options.mimeType}\r\n\r\n`
      ),
      options.buffer,
      Buffer.from(closeDelimiter),
    ]);

    const md5Checksum = crypto.createHash("md5").update(options.buffer).digest("hex");

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const res = await fetch(
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,size,md5Checksum,headRevisionId,webViewLink,webContentLink,thumbnailLink",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": `multipart/related; boundary=${boundary}`,
            "Content-Length": String(multipartBody.length),
          },
          body: multipartBody,
          signal: controller.signal,
        }
      ).finally(() => clearTimeout(timeout));

      if (res.ok) {
        const data = await res.json();
        if (data?.id) {
          if (shouldBePublic) {
            await makeDriveFilePublic(data.id, token);
          } else {
            // Fail-closed: nếu không khóa được quyền riêng tư cho bằng chứng thì hủy kết quả Drive này
            await ensureDriveFilePrivate(data.id, token);
          }

          return {
            fileId: data.id,
            name: data.name || options.fileName,
            viewUrl: data.webViewLink || `https://drive.google.com/file/d/${data.id}/view`,
            downloadUrl: data.webContentLink || `https://drive.google.com/uc?id=${data.id}&export=download`,
            thumbnailUrl: data.thumbnailLink,
            storageWarehouse: "Google Drive REST",
            md5Checksum: String(data.md5Checksum || md5Checksum).toLowerCase(),
            headRevisionId: typeof data.headRevisionId === "string" && data.headRevisionId.trim() ? data.headRevisionId.trim() : undefined,
            sizeBytes: Number(data.size || options.buffer.length),
          };
        }
      } else {
        const err = await res.text();
        console.warn("⚠️ [GoogleDrive] REST multipart upload không thành công, thử phương án tiếp theo:", err);
      }
    } catch (error) {
      console.warn("⚠️ [GoogleDrive] Ngoại lệ REST upload hoặc từ chối ACL:", error);
      if (!shouldBePublic) {
        // Đối với bằng chứng riêng tư, không chuyển sang Apps Script Webhook nếu không có REST token kiểm soát ACL
        return null;
      }
    }
  }

  // 🌟 Tuyệt đối KHÔNG dùng Apps Script Webhook cho bằng chứng riêng tư khi không có OAuth/Service Account token để khóa và xác minh ACL + headRevisionId
  if (!shouldBePublic && !token) {
    return null;
  }

  // 🌟 Ưu tiên 2: Chỉ dùng Apps Script Webhook khi có cấu hình và sau khi upload sẽ khóa lại quyền riêng tư nếu là bằng chứng
  const webhooksToTry: Array<{ name: string; url: string }> = [];
  if (targetKho === "kho2" && config.webhookUrl2) {
    webhooksToTry.push({ name: "Kho 2 (5TB)", url: config.webhookUrl2 });
  } else if (targetKho === "kho1" && config.webhookUrl1) {
    webhooksToTry.push({ name: "Kho 1 (5TB)", url: config.webhookUrl1 });
  } else {
    if (config.webhookUrl1) webhooksToTry.push({ name: "Kho 1 (5TB)", url: config.webhookUrl1 });
    if (config.webhookUrl2) webhooksToTry.push({ name: "Kho 2 (5TB)", url: config.webhookUrl2 });
  }

  if (webhooksToTry.length > 0) {
    const base64 = options.buffer.toString("base64");
    for (const wh of webhooksToTry) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);
        const res = await fetch(wh.url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: options.fileName,
            mimeType: options.mimeType,
            base64,
            isPublic: shouldBePublic,
          }),
          redirect: "follow",
          signal: controller.signal,
        }).finally(() => clearTimeout(timeout));

        if (res.ok) {
          const data = await res.json();
          if (data.success && data.fileId) {
            if (!shouldBePublic && token) {
              await ensureDriveFilePrivate(data.fileId, token);
            }
            return {
              fileId: data.fileId,
              name: options.fileName,
              viewUrl: data.url || `https://drive.google.com/file/d/${data.fileId}/view`,
              downloadUrl: data.downloadUrl || `https://drive.google.com/uc?id=${data.fileId}&export=download`,
              thumbnailUrl: `https://lh3.googleusercontent.com/d/${data.fileId}=w1000`,
              storageWarehouse: wh.name,
              md5Checksum: sha256Checksum,
              sizeBytes: options.buffer.length,
            };
          }
        }
      } catch (whErr) {
        console.warn(`⚠️ [GoogleDrive] Lỗi tải lên ${wh.name}, thử phương án tiếp theo:`, whErr);
      }
    }
  }

  return null;
}

/**
 * Cấp quyền đọc công khai cho tệp (CHỈ gọi cho tài nguyên công khai, TUYỆT ĐỐI KHÔNG gọi cho bằng chứng tranh chấp)
 */
export async function makeDriveFilePublic(fileId: string, customToken?: string): Promise<boolean> {
  const token = customToken || (await getDriveAccessToken());
  if (!token) return false;

  try {
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        role: "reader",
        type: "anyone",
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
