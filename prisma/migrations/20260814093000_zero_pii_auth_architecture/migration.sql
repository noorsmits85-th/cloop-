/*
  Warnings:

  - You are about to drop the column `email` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `password` on the `User` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX IF EXISTS "User_email_key";

-- AlterTable
ALTER TABLE "User" DROP COLUMN IF EXISTS "email",
DROP COLUMN IF EXISTS "password";

-- Backfill existing users from auth.users to public.User
INSERT INTO "User" (id, name, role)
SELECT 
  id, 
  COALESCE(raw_user_meta_data->>'name', split_part(email, '@', 1)), 
  'USER'::"UserRole"
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- Create Trigger Function for auto-syncing new signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public."User" (id, name, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    'USER'::"UserRole"
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind Trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Enable RLS on User table
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;

-- Policy: Select (Public Profiles are viewable by everyone)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON "User";
CREATE POLICY "Public profiles are viewable by everyone."
ON "User" FOR SELECT
USING ( true );

-- Policy: Update (Users can update their own profile)
DROP POLICY IF EXISTS "Users can update own profile." ON "User";
CREATE POLICY "Users can update own profile."
ON "User" FOR UPDATE
USING ( auth.uid() = id::uuid );
