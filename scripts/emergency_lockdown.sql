-- ============================================================================
-- CLOOP EMERGENCY SECURITY LOCKDOWN SCRIPT (SUPABASE POSTGRESQL)
-- Muc tieu: Vo hieu hoa hoan toan truy cap PostgREST trai phep tu role anon
-- va authenticated, giu nguyen 100% quyen hoat dong cho Prisma ORM.
-- ============================================================================
BEGIN;

-- ----------------------------------------------------------------------------
-- BUOC 1: THU HOI TOAN BO QUYEN (REVOKE ALL) TREN CAC DOI TUONG HIEN TAI
-- Thu hoi SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
-- ----------------------------------------------------------------------------
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon, authenticated, PUBLIC;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated, PUBLIC;
REVOKE ALL PRIVILEGES ON ALL ROUTINES IN SCHEMA public FROM anon, authenticated, PUBLIC;

-- ----------------------------------------------------------------------------
-- BUOC 2: KHOA DEFAULT PRIVILEGES CHO CAC BANG TAO MOI TRONG TUONG LAI
-- Ngan chan viec chay "npx prisma db push" tao bang moi bi tu dong cap quyen lai
-- ----------------------------------------------------------------------------
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated, PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated, PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON ROUTINES FROM anon, authenticated, PUBLIC;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated, PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated, PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON ROUTINES FROM anon, authenticated, PUBLIC;

-- ----------------------------------------------------------------------------
-- BUOC 3: BAT ROW LEVEL SECURITY (RLS) TUONG MINH CHO CAC BANG TRONG YEU
-- Su dung IF EXISTS de dam bao thuc thi an toan tuyet doi
-- ----------------------------------------------------------------------------
ALTER TABLE IF EXISTS public."User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."Invoice" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."LedgerTransaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."withdrawal_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."rental_history" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."products" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."Listing" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."ProductImage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."Review" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."TransactionHistory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."AccountingPeriod" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."coin_topups" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."coin_ledger_entries" ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- BUOC 4: VONG LAP QUET VA BAT RLS CHO TAT CA CAC BANG CON LAI TRONG PUBLIC
-- Dam bao 100% bang trong schema public deu duoc bat RLS khong sot mot bang nao.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
    tbl RECORD;
BEGIN
    FOR tbl IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl.tablename);
    END LOOP;
END $$;

COMMIT;
