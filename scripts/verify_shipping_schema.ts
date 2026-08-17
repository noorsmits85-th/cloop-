import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifySchema() {
  console.log("🔍 Verifying Production Schema for Shipping Phase 1...");

  try {
    // 1. Check if 'shipments' table exists
    const tableCheck: any[] = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'shipments'
      ) as exists;
    `;
    console.log(`- Table 'shipments' exists: ${tableCheck[0].exists ? '✅' : '❌'}`);

    // 2. Check if Enum OWNER_PACKED exists in RentalStatus
    const enumCheck: any[] = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT 1 FROM pg_type t
        JOIN pg_enum e ON t.oid = e.enumtypid
        WHERE t.typname = 'RentalStatus' AND e.enumlabel = 'OWNER_PACKED'
      ) as exists;
    `;
    console.log(`- Enum 'OWNER_PACKED' in RentalStatus exists: ${enumCheck[0].exists ? '✅' : '❌'}`);

    // 3. Check for specific constraints
    const constraints: any[] = await prisma.$queryRaw`
      SELECT conname as name
      FROM pg_constraint 
      WHERE conrelid = (SELECT oid FROM pg_class WHERE relname = 'shipments')
      OR conrelid = (SELECT oid FROM pg_class WHERE relname = 'Invoice')
      UNION
      SELECT indexrelid::regclass::text as name
      FROM pg_index
      WHERE indrelid = (SELECT oid FROM pg_class WHERE relname = 'shipments')
      AND indisunique = true;
    `;
    const constraintNames = constraints.map(c => c.name.replace(/"/g, ''));

    const requiredConstraints = [
      'shipments_rentalId_direction_key', // Unique rentalId_direction
      'shipments_provider_providerOrderCode_key', // Unique provider_providerOrderCode
      'shipments_shippingFeeCollected_nonnegative', // Check non-negative
      'Invoice_shippingFeeCollected_nonnegative', // Check non-negative invoice
    ];

    for (const req of requiredConstraints) {
      console.log(`- Constraint '${req}' exists: ${constraintNames.includes(req) ? '✅' : '❌'}`);
    }

    // 4. Check foreign key to rental_history
    const fkCheck: any[] = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'shipments_rentalId_fkey' 
        AND contype = 'f'
      ) as exists;
    `;
    console.log(`- Foreign Key 'shipments_rentalId_fkey' exists: ${fkCheck[0].exists ? '✅' : '❌'}`);

  } catch (error) {
    console.error("❌ Error verifying schema:", error);
  } finally {
    await prisma.$disconnect();
  }
}

verifySchema();
