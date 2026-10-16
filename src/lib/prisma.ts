import { PrismaClient } from "@prisma/client";

const createExtendedClient = (baseClient: PrismaClient) => {
  return baseClient.$extends({
    query: {
      $allModels: {
        async findMany({ model, operation, args, query }) {
          if ('isDeleted' in (baseClient as any)[model].fields) {
            args.where = { isDeleted: false, ...args.where };
          }
          return query(args);
        },
        async findUnique({ model, operation, args, query }) {
          if ('isDeleted' in (baseClient as any)[model].fields) {
            args.where = { isDeleted: false, ...args.where };
            return (baseClient as any)[model].findFirst(args);
          }
          return query(args);
        },
        async findUniqueOrThrow({ model, operation, args, query }) {
          if ('isDeleted' in (baseClient as any)[model].fields) {
            args.where = { isDeleted: false, ...args.where };
            return (baseClient as any)[model].findFirstOrThrow(args);
          }
          return query(args);
        },
        async findFirst({ model, operation, args, query }) {
          if ('isDeleted' in (baseClient as any)[model].fields) {
            args.where = { isDeleted: false, ...args.where };
          }
          return query(args);
        },
        async findFirstOrThrow({ model, operation, args, query }) {
          if ('isDeleted' in (baseClient as any)[model].fields) {
            args.where = { isDeleted: false, ...args.where };
          }
          return query(args);
        },
        async count({ model, operation, args, query }) {
          if ('isDeleted' in (baseClient as any)[model].fields) {
            args.where = { isDeleted: false, ...args.where };
          }
          return query(args);
        },
        // Chặn và bẻ lái các hàm thay đổi dữ liệu
        async update({ model, operation, args, query }) {
          if ('isDeleted' in (baseClient as any)[model].fields) {
            args.where = { isDeleted: false, ...args.where };
          }
          return query(args);
        },
        async updateMany({ model, operation, args, query }) {
          if ('isDeleted' in (baseClient as any)[model].fields) {
            args.where = { isDeleted: false, ...args.where };
          }
          return query(args);
        },
        async delete({ model, operation, args, query }) {
          if ('isDeleted' in (baseClient as any)[model].fields) {
            return (baseClient as any)[model].update({
              where: args.where,
              data: { isDeleted: true },
            });
          }
          return query(args);
        },
        async deleteMany({ model, operation, args, query }) {
          if ('isDeleted' in (baseClient as any)[model].fields) {
            return (baseClient as any)[model].updateMany({
              where: args.where,
              data: { isDeleted: true },
            });
          }
          return query(args);
        },
      },
    },
  });
};

type ExtendedPrismaClient = ReturnType<typeof createExtendedClient>;

function getSanitizedDatabaseUrl() {
  const rawUrl = process.env.DATABASE_URL || "";
  if (!rawUrl) return undefined;

  // ⚡ TỐI ƯU HÓA POOLING SERVERLESS TRÊN VERCEL + SUPABASE:
  // Supabase PostgreSQL sử dụng Supavisor Pooler (Port 6543) hỗ trợ Transaction Mode.
  // Đặt connection_limit=1 cho mỗi serverless function trên Vercel để tránh chạm trần Pool Supabase khi nhiều hàm chạy song song.
  try {
    const parsed = new URL(rawUrl);
    parsed.searchParams.set("connection_limit", "1");
    parsed.searchParams.set("pool_timeout", "10");
    parsed.searchParams.set("connect_timeout", "10");

    // Khi kết nối qua PgBouncer / Supavisor ở Transaction Mode (cổng 6543 hoặc host pooler),
    // Prisma BẮT BUỘC cần cờ pgbouncer=true để tắt prepared statements.
    if (parsed.port === "6543" || parsed.hostname.includes("pooler.supabase.com")) {
      parsed.searchParams.set("pgbouncer", "true");
    }

    return parsed.toString();
  } catch (err) {
    // Fallback an toàn nếu DATABASE_URL chứa ký tự đặc biệt khiến new URL() ném ngoại lệ
    let url = rawUrl;
    if (url.includes("connection_limit=")) {
      url = url.replace(/connection_limit=\d+/g, "connection_limit=1");
    } else {
      url += (url.includes("?") ? "&" : "?") + "connection_limit=1";
    }

    if (url.includes("pool_timeout=")) {
      url = url.replace(/pool_timeout=\d+/g, "pool_timeout=10");
    } else {
      url += (url.includes("?") ? "&" : "?") + "pool_timeout=10";
    }

    if (url.includes("connect_timeout=")) {
      url = url.replace(/connect_timeout=\d+/g, "connect_timeout=10");
    } else {
      url += (url.includes("?") ? "&" : "?") + "connect_timeout=10";
    }

    if ((url.includes(":6543") || url.includes("pooler.supabase.com")) && !url.includes("pgbouncer=true")) {
      url += (url.includes("?") ? "&" : "?") + "pgbouncer=true";
    }

    return url;
  }
}

const createBaseClient = () => {
  const customUrl = getSanitizedDatabaseUrl();
  return new PrismaClient(
    customUrl ? { datasources: { db: { url: customUrl } } } : undefined
  );
};

const globalForPrisma = globalThis as unknown as {
  prismaBase: PrismaClient | undefined;
  prisma: ExtendedPrismaClient | undefined;
};

// Base Prisma Client (for Admin/Unfiltered queries)
export const prismaAdmin = globalForPrisma.prismaBase ?? createBaseClient();
globalForPrisma.prismaBase = prismaAdmin;

// Extended Prisma Client (for End-User/Filtered queries)
export const prisma = globalForPrisma.prisma ?? createExtendedClient(prismaAdmin);
globalForPrisma.prisma = prisma;
