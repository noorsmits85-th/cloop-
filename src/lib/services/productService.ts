import { prismaAdmin } from "../prisma";
import { validateProductTransition, validateListingTransition } from "../stateMachine";
import { ProductStatus, ListingStatus } from "@prisma/client";

export class ProductService {
  /**
   * Publishes a DRAFT product to the market by updating its status
   * and ensuring state transitions are valid.
   */
  static async publishProduct(productId: string) {
    const product = await prismaAdmin.product.findUniqueOrThrow({
      where: { id: productId }
    });

    if (!validateProductTransition(product.status, "ON_MARKET")) {
      throw new Error(`Invalid state transition: Cannot publish product from state ${product.status}`);
    }

    return prismaAdmin.product.update({
      where: { id: productId },
      data: { status: "ON_MARKET" }
    });
  }

  /**
   * Handles creating a new listing for an existing product (Relist)
   */
  static async relistProduct(productId: string, newPrice: number, userId: string) {
    const product = await prismaAdmin.product.findUniqueOrThrow({
      where: { id: productId, userId: userId }
    });

    if (!validateProductTransition(product.status, "ON_MARKET")) {
      throw new Error(`Cannot relist product from state ${product.status}. It must be IN_CLOSET.`);
    }

    return prismaAdmin.$transaction(async (tx) => {
      // Hide any existing active listings for this product
      await tx.listing.updateMany({
        where: { productId: product.id, status: { in: ["AVAILABLE", "RESERVED"] } },
        data: { status: "HIDDEN" }
      });

      await tx.product.update({
        where: { id: product.id },
        data: { status: "ON_MARKET" }
      });

      return tx.listing.create({
        data: {
          productId: product.id,
          listingType: "SELL", // Assuming sell for now
          status: "AVAILABLE",
          basePrice: newPrice,
          salePrice: newPrice
        }
      });
    });
  }

  // Other operations like rentProduct, returnProduct can go here.
}
