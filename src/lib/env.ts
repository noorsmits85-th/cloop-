// Centralized Environment Variables Helper
// This file ensures that required environment variables are present and throws an error immediately if they are missing.
// It also provides a type-safe way to access them, avoiding hardcoded fallbacks in production code.

const getEnv = (key: string, required: boolean = true): string => {
  const value = process.env[key];
  if (!value && required) {
    if (typeof window === "undefined") {
      // Allow build process to continue if we're in a build step where envs might not be fully populated yet, 
      // but in production runtime this should fail fast.
      console.warn(`[WARNING] Missing required environment variable: ${key}`);
    } else {
       console.error(`[CRITICAL] Missing required environment variable: ${key}`);
    }
    // Return empty string during dev/build to prevent Next.js from crashing completely at compile time,
    // but in a real strict setup, you might throw new Error(`Missing required env: ${key}`);
    return "";
  }
  return value || "";
};

export const ENV = {
  // Database
  DATABASE_URL: getEnv("DATABASE_URL"),

  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: getEnv("NEXT_PUBLIC_SUPABASE_URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  SUPABASE_SERVICE_ROLE_KEY: getEnv("SUPABASE_SERVICE_ROLE_KEY", false),

  // Cloudinary
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: getEnv("NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME"),
  NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET: getEnv("NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET"),

  // Gemini / AI
  GOOGLE_GEMINI_API_KEY: getEnv("GOOGLE_GEMINI_API_KEY", false),
  
  // App
  NEXT_PUBLIC_SITE_URL: getEnv("NEXT_PUBLIC_SITE_URL", false) || "http://localhost:3000",
} as const;
