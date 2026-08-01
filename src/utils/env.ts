export const getEnv = (key: string, required: boolean = true): string => {
  const value = process.env[key];
  if (!value && required) {
    throw new Error(`[ENV ERROR] Missing required environment variable: ${key}`);
  }
  return value || '';
};

export const env = {
  NEXT_PUBLIC_SUPABASE_URL: getEnv('NEXT_PUBLIC_SUPABASE_URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  // Add server-side only env vars here if needed
  // DATABASE_URL: getEnv('DATABASE_URL'), // Prisma uses it natively though
};
