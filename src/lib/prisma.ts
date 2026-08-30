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

const globalForPrisma = globalThis as unknown as {
  prismaBase: PrismaClient | undefined;
  prisma: ExtendedPrismaClient | undefined;
};

// Base Prisma Client (for Admin/Unfiltered queries)
export const prismaAdmin = globalForPrisma.prismaBase ?? new PrismaClient();
globalForPrisma.prismaBase = prismaAdmin;

// Extended Prisma Client (for End-User/Filtered queries)
export const prisma = globalForPrisma.prisma ?? createExtendedClient(prismaAdmin);
globalForPrisma.prisma = prisma;
