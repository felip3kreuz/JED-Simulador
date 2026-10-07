import { NextResponse } from "next/server";
import { currentUser, sessionToken } from "@/lib/auth-server";
import { JEDServerError, jedServerRequest } from "@/lib/jed-server";
import { normalizeRole } from "@/lib/roles";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const user = await currentUser();
    if (!user) throw new JEDServerError("Sessão inválida ou expirada.", 401);
    if (normalizeRole(user.role) !== "admin") throw new JEDServerError("Acesso permitido apenas para Administradores.", 403);
    const input = await request.json();
    const token = await sessionToken();
    const action = String(input?.action || "");
    let path;
    let body;
    switch (action) {
      case "user_status":
        path = "/api/v1/admin/user-status";
        body = { user_id: input.user_id, status: input.status };
        break;
      case "mentor_permission":
        path = "/api/v1/admin/mentor-permission";
        body = { user_id: input.user_id, allowed: Boolean(input.allowed) };
        break;
      case "create_admin":
        path = "/api/v1/admin/create-admin";
        body = { name: input.name, email: input.email, password: input.password };
        break;
      case "transfer_primary":
        path = "/api/v1/admin/transfer-primary";
        body = { user_id: input.user_id };
        break;
      case "mentor_invitation":
        path = "/api/v1/mentor-invitations";
        body = { name: input.name, email: input.email, institution: input.institution, institutional_id: input.institutional_id };
        break;
      default:
        return NextResponse.json({ error: "Ação administrativa inválida." }, { status: 400 });
    }
    const result = await jedServerRequest(path, { method: "POST", token, body });
    return NextResponse.json({ result }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const status = error instanceof JEDServerError ? error.status : 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Falha na operação administrativa." }, { status });
  }
}
