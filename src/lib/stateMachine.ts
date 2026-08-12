import { ProductStatus, ListingStatus } from "@prisma/client";

/**
 * Validates if a Product can transition from currentStatus to targetStatus.
 */
export function validateProductTransition(currentStatus: ProductStatus, targetStatus: ProductStatus): boolean {
  switch (currentStatus) {
    case "DRAFT":
      return ["IN_CLOSET", "ON_MARKET"].includes(targetStatus);
    case "IN_CLOSET":
      return ["ON_MARKET", "IN_TRANSIT"].includes(targetStatus);
    case "ON_MARKET":
      return ["IN_CLOSET", "IN_TRANSIT", "WITH_RENTER"].includes(targetStatus);
    case "IN_TRANSIT":
      return ["WITH_RENTER", "IN_CLOSET"].includes(targetStatus);
    case "WITH_RENTER":
      return ["IN_TRANSIT", "IN_CLOSET"].includes(targetStatus);
    default:
      return false;
  }
}

/**
 * Validates if a Listing can transition from currentStatus to targetStatus.
 */
export function validateListingTransition(currentStatus: ListingStatus, targetStatus: ListingStatus): boolean {
  switch (currentStatus) {
    case "AVAILABLE":
      return ["RESERVED", "SOLD", "RENTED", "HIDDEN", "RECYCLED"].includes(targetStatus);
    case "RESERVED":
      return ["AVAILABLE", "SOLD", "RENTED", "HIDDEN"].includes(targetStatus);
    case "RENTED":
      return ["AVAILABLE", "HIDDEN"].includes(targetStatus); // Rented items must be returned to AVAILABLE or HIDDEN
    case "HIDDEN":
      return ["AVAILABLE", "RECYCLED"].includes(targetStatus);
    case "SOLD":
    case "RECYCLED":
      return false; // Terminal states
    default:
      return false;
  }
}

/**
 * Validates if a Product is eligible for a new Listing (Relist).
 */
export function canCreateListing(productStatus: ProductStatus): boolean {
  // Only items physically in the closet can be relisted
  return productStatus === "IN_CLOSET";
}
