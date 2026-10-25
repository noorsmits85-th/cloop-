require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function setup() {
    try {
        console.log("Creating tables on Supabase...");

        await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS public.tdv_users (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                unlocked_subjects TEXT[] DEFAULT '{}'::TEXT[],
                created_at TIMESTAMPTZ DEFAULT now(),
                updated_at TIMESTAMPTZ DEFAULT now()
            );
        `);
        console.log("Created public.tdv_users");

        await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS public.tdv_license_keys (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                key TEXT UNIQUE NOT NULL,
                scope TEXT NOT NULL,
                used BOOLEAN DEFAULT false,
                used_at TIMESTAMPTZ,
                used_by TEXT,
                created_at TIMESTAMPTZ DEFAULT now()
            );
        `);
        console.log("Created public.tdv_license_keys");

        // Enable RLS for security
        await prisma.$executeRawUnsafe(`ALTER TABLE public.tdv_users ENABLE ROW LEVEL SECURITY;`);
        await prisma.$executeRawUnsafe(`ALTER TABLE public.tdv_license_keys ENABLE ROW LEVEL SECURITY;`);

        // Policies
        await prisma.$executeRawUnsafe(`DROP POLICY IF EXISTS allow_all_tdv_users ON public.tdv_users;`);
        await prisma.$executeRawUnsafe(`CREATE POLICY allow_all_tdv_users ON public.tdv_users FOR ALL USING (true) WITH CHECK (true);`);

        await prisma.$executeRawUnsafe(`DROP POLICY IF EXISTS allow_all_tdv_keys ON public.tdv_license_keys;`);
        await prisma.$executeRawUnsafe(`CREATE POLICY allow_all_tdv_keys ON public.tdv_license_keys FOR ALL USING (true) WITH CHECK (true);`);

        console.log("Tables and policies configured successfully on Supabase!");

        // Verify tables
        const check = await prisma.$queryRawUnsafe(`
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name LIKE 'tdv_%';
        `);
        console.log("Verified Supabase tables:", check);

    } catch (err) {
        console.error("Setup error:", err);
    } finally {
        await prisma.$disconnect();
    }
}

setup();
