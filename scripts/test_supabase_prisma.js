const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function main() {
    try {
        const res = await prisma.$queryRawUnsafe('SELECT current_database(), current_user;');
        console.log('PRISMA_SUPABASE_CONNECTED:', res);
    } catch (e) {
        console.error('PRISMA_ERROR:', e);
    } finally {
        await prisma.$disconnect();
    }
}
main();
