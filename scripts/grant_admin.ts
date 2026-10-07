import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const targetEmail = 'tranthitrinh0501@gmail.com';
  console.log('--- Granting ADMIN role to:', targetEmail);

  const existing = await prisma.user.findFirst({
    where: { email: { equals: targetEmail, mode: 'insensitive' } }
  });

  if (existing) {
    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: { role: 'ADMIN' }
    });
    console.log('✅ Successfully updated user to ADMIN:', {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      role: updated.role
    });
  } else {
    const created = await prisma.user.create({
      data: {
        email: targetEmail,
        password: 'supabase_auth_managed',
        role: 'ADMIN',
        name: 'Trinh Trần',
        walletBalance: 0,
        cloopCoins: 1000,
        isVerified: true
      }
    });
    console.log('✅ Created user with ADMIN role:', {
      id: created.id,
      email: created.email,
      name: created.name,
      role: created.role
    });
  }

  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN' },
    select: { id: true, email: true, name: true, role: true }
  });
  console.log('📋 Current list of Admins in system:', admins);
}

main()
  .then(() => {
    console.log('SUCCESS');
    process.exit(0);
  })
  .catch((e) => {
    console.error('Error granting admin:', e);
    process.exit(1);
  });
