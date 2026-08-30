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
  let url = process.env.DATABASE_URL || "";
  if (!url) return undefined;
  // Bẻ khóa triệt để connection_limit=1 bị set cứng từ Vercel Env thành connection_limit=15
  url = url.replace(/connection_limit=\d+/g, "connection_limit=15");
  if (!url.includes("connection_limit=")) {
    const separator = url.includes("?") ? "&" : "?";
    url = `${url}${separator}connection_limit=15`;
  }
  if (url.includes("pool_timeout=")) {
    url = url.replace(/pool_timeout=\d+/g, "pool_timeout=30");
  } else {
    const separator = url.includes("?") ? "&" : "?";
    url = `${url}${separator}pool_timeout=30`;
  }
  return url;
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
