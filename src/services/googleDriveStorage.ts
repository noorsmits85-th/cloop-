import crypto from "node:crypto";

const CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL;
const PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
const DEFAULT_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;
const WEBHOOK_URL = process.env.GOOGLE_DRIVE_WEBHOOK_URL;

/**
 * Tạo Google Drive OAuth2 Access Token bằng Service Account JWT (RS256)
 */
async function getDriveAccessToken(): Promise<string | null> {
  if (!CLIENT_EMAIL || !PRIVATE_KEY) {
    console.warn("⚠️ [GoogleDrive] Chưa cấu hình GOOGLE_CLIENT_EMAIL hoặc GOOGLE_PRIVATE_KEY.");
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: CLIENT_EMAIL,
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
    .sign(PRIVATE_KEY, "base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  const jwt = `${unsignedToken}.${signature}`;

  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt,
      }),
    });

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

export interface DriveUploadOptions {
  fileName: string;
  mimeType: string;
  buffer: Buffer;
  folderId?: string;
  isPublic?: boolean;
}

export interface DriveUploadResult {
  fileId: string;
  name: string;
  viewUrl: string;
  downloadUrl: string;
  thumbnailUrl?: string;
}

/**
 * Tải tệp (ảnh, video, bản sao lưu) lên Google Drive 5TB qua Multipart Upload
 */
export async function uploadToGoogleDrive(
  options: DriveUploadOptions
): Promise<DriveUploadResult | null> {
  // 🌟 Ưu tiên 1: Tải trực tiếp qua Google Apps Script Webhook (Hút trọn 5TB Google One chính chủ)
  if (WEBHOOK_URL) {
    try {
      const base64 = options.buffer.toString("base64");
      const res = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: options.fileName,
          mimeType: options.mimeType,
          base64: base64,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.fileId) {
          return {
            fileId: data.fileId,
            name: options.fileName,
            viewUrl: data.url || `https://drive.google.com/file/d/${data.fileId}/view`,
            downloadUrl: `https://drive.google.com/uc?id=${data.fileId}&export=download`,
          };
        }
      }
    } catch (whErr) {
      console.warn("⚠️ [GoogleDrive] Lỗi tải qua Webhook 5TB, chuyển sang REST API:", whErr);
    }
  }

  // 🌟 Ưu tiên 2: Fallback qua Service Account REST API
  const token = await getDriveAccessToken();
  if (!token) return null;

  const targetFolder = options.folderId || DEFAULT_FOLDER_ID;
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

  try {
    const res = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink,thumbnailLink",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": `multipart/related; boundary=${boundary}`,
          "Content-Length": String(multipartBody.length),
        },
        body: multipartBody,
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error("❌ [GoogleDrive] Lỗi tải tệp lên Drive:", err);
      return null;
    }

    const data = await res.json();

    if (options.isPublic && data.id) {
      await makeDriveFilePublic(data.id, token);
    }

    return {
      fileId: data.id,
      name: data.name,
      viewUrl: data.webViewLink || `https://drive.google.com/file/d/${data.id}/view`,
      downloadUrl: data.webContentLink || `https://drive.google.com/uc?id=${data.id}&export=download`,
      thumbnailUrl: data.thumbnailLink,
    };
  } catch (error) {
    console.error("❌ [GoogleDrive] Ngoại lệ khi upload file:", error);
    return null;
  }
}

/**
 * Cấp quyền đọc công khai cho tệp nếu cần hiển thị trực tiếp
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
