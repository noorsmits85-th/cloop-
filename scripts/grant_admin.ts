import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_ADMIN_GRANT_CLI !== 'true') {
    throw new Error('SECURITY_BLOCK: Admin grant script requires ALLOW_ADMIN_GRANT_CLI=true in production.');
  }

  const targetEmail = (process.env.TARGET_ADMIN_EMAIL || '').trim();
  if (!targetEmail) {
    throw new Error('Missing required env TARGET_ADMIN_EMAIL.');
  }

  console.log('--- Granting ADMIN role to:', targetEmail);

  const existing = await prisma.user.findFirst({
    where: { email: { equals: targetEmail, mode: 'insensitive' } }
  });

  if (existing) {
    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: { role: 'ADMIN' }
    });
    console.log('Successfully updated user to ADMIN:', {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      role: updated.role
    });
  } else {
    throw new Error(`User with email ${targetEmail} does not exist. Register via Supabase Auth first.`);
  }
}

main()
  .then(() => {
    console.log('SUCCESS');
    process.exit(0);
  })
  .catch((e) => {
    console.error('Error granting admin:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
