import RoleDashboard from "@/components/role-dashboard";
import { requireRole } from "@/lib/auth-server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mentor · JED Simulador" };

export default async function MentorPage() {
  const user = await requireRole("mentor");
  return <RoleDashboard user={user} role="mentor" />;
}
