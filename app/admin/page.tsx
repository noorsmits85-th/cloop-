import { redirect } from 'next/navigation';
import { createClient } from '@/src/utils/supabase/server';
import { prisma } from '@/src/lib/prisma';
import AdminDashboardClient from './AdminDashboardClient';

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.user?.email) {
    redirect('/login');
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, name: true, cloopLeaves: true }
  });

  if (!user || user.role !== 'ADMIN') {
    // Nếu không phải admin, đá về trang chủ
    redirect('/');
  }

  return (
    <div className="min-h-screen bg-slate-900 pb-20 pt-16">
      <AdminDashboardClient currentAdmin={{ name: user.name || session.user.email, coins: user.cloopLeaves }} />
    </div>
  );
}
