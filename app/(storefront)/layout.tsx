export default function StorefrontLayout({ children }: { children: React.ReactNode }) {
  // Storefront inherits ClientLayout from the root layout (app/layout.tsx).
  return <>{children}</>;
}