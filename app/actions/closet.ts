"use server";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function getClosetProfile(userId: string) {
  const profile = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      avatar: true,
      createdAt: true,
      totalListings: true,
      completedOrders: true
    }
  });
  return profile;
}

export async function getClosetProducts(userId: string, page: number = 1, take: number = 12) {
  const skip = (page - 1) * take;
  const products = await prisma.product.findMany({
    where: { userId, isDeleted: false },
    orderBy: { lastBumpedAt: "desc" },
    skip,
    take,
    include: {
      images: {
        orderBy: { sortOrder: 'asc' },
        take: 1
      },
      listings: true
    }
  });

  const totalCount = await prisma.product.count({
    where: { userId, isDeleted: false }
  });

  return {
    products,
    hasMore: skip + products.length < totalCount
  };
}
