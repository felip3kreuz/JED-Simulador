import RoleDashboard from "@/components/role-dashboard";
import { requireRole } from "@/lib/auth-server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Administrador · JED Simulador" };

export default async function AdminPage() {
  const user = await requireRole("admin");
  return <RoleDashboard user={user} role="admin" />;
}
