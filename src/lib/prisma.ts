import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prismaBase: PrismaClient | undefined;
};

// Base Prisma Client (for Admin/Unfiltered queries)
export const prismaAdmin = globalForPrisma.prismaBase ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prismaBase = prismaAdmin;
}

// Extended Prisma Client (for End-User/Filtered queries)
export const prisma = prismaAdmin.$extends({
  query: {
    $allModels: {
      async findMany({ model, operation, args, query }) {
        if ('isDeleted' in (prismaAdmin as any)[model].fields) {
          args.where = { isDeleted: false, ...args.where };
        }
        return query(args);
      },
      async findUnique({ model, operation, args, query }) {
        if ('isDeleted' in (prismaAdmin as any)[model].fields) {
          args.where = { isDeleted: false, ...args.where };
          return (prismaAdmin as any)[model].findFirst(args);
        }
        return query(args);
      },
      async findUniqueOrThrow({ model, operation, args, query }) {
        if ('isDeleted' in (prismaAdmin as any)[model].fields) {
          args.where = { isDeleted: false, ...args.where };
          return (prismaAdmin as any)[model].findFirstOrThrow(args);
        }
        return query(args);
      },
      async findFirst({ model, operation, args, query }) {
        if ('isDeleted' in (prismaAdmin as any)[model].fields) {
          args.where = { isDeleted: false, ...args.where };
        }
        return query(args);
      },
      async findFirstOrThrow({ model, operation, args, query }) {
        if ('isDeleted' in (prismaAdmin as any)[model].fields) {
          args.where = { isDeleted: false, ...args.where };
        }
        return query(args);
      },
      async count({ model, operation, args, query }) {
        if ('isDeleted' in (prismaAdmin as any)[model].fields) {
          args.where = { isDeleted: false, ...args.where };
        }
        return query(args);
      },
      // Chặn và bẻ lái các hàm thay đổi dữ liệu
      async update({ model, operation, args, query }) {
        if ('isDeleted' in (prismaAdmin as any)[model].fields) {
          args.where = { isDeleted: false, ...args.where };
        }
        return query(args);
      },
      async updateMany({ model, operation, args, query }) {
        if ('isDeleted' in (prismaAdmin as any)[model].fields) {
          args.where = { isDeleted: false, ...args.where };
        }
        return query(args);
      },
      async delete({ model, operation, args, query }) {
        if ('isDeleted' in (prismaAdmin as any)[model].fields) {
          return (prismaAdmin as any)[model].update({
            where: args.where,
            data: { isDeleted: true },
          });
        }
        return query(args);
      },
      async deleteMany({ model, operation, args, query }) {
        if ('isDeleted' in (prismaAdmin as any)[model].fields) {
          return (prismaAdmin as any)[model].updateMany({
            where: args.where,
            data: { isDeleted: true },
          });
        }
        return query(args);
      },
    },
  },
});
