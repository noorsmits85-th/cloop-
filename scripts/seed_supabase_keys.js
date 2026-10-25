require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function seedKeys() {
    try {
        console.log("Seeding license keys to Supabase...");
        
        const html = fs.readFileSync('index.html', 'utf8');
        const startIdx = html.indexOf('const DEFAULT_KEYS = [');
        if (startIdx === -1) {
            console.error("Could not find DEFAULT_KEYS in index.html");
            return;
        }
        const endIdx = html.indexOf('];', startIdx);
        const keysJson = html.substring(startIdx + 'const DEFAULT_KEYS = '.length, endIdx + 1);
        const keys = JSON.parse(keysJson);
        console.log(`Found ${keys.length} keys to seed.`);

        let usedKeys = [];
        try {
            const usedFile = path.join(__dirname, '..', 'scratch', 'used_keys.json');
            if (fs.existsSync(usedFile)) {
                usedKeys = JSON.parse(fs.readFileSync(usedFile, 'utf8')) || [];
            }
        } catch (e) {}

        const valueRows = keys.map(k => {
            const isUsed = usedKeys.includes(k.key.toUpperCase()) || k.used;
            const usedAtVal = isUsed ? `'${new Date().toISOString()}'::timestamptz` : 'NULL';
            return `('${k.key.toUpperCase()}', '${k.scope}', ${isUsed}, ${usedAtVal})`;
        }).join(',\n');

        const query = `
            INSERT INTO public.tdv_license_keys (key, scope, used, used_at)
            VALUES 
            ${valueRows}
            ON CONFLICT (key) DO UPDATE
            SET used = EXCLUDED.used, used_at = EXCLUDED.used_at;
        `;

        await prisma.$executeRawUnsafe(query);
        console.log("Batch inserted all keys successfully!");

        const count = await prisma.$queryRawUnsafe(`
            SELECT count(*)::int as total, 
                   count(*) filter (where used = true)::int as used_count 
            FROM public.tdv_license_keys;
        `);
        console.log("Supabase tdv_license_keys status:", count);

    } catch (err) {
        console.error("Error seeding keys:", err);
    } finally {
        await prisma.$disconnect();
    }
}

seedKeys();
