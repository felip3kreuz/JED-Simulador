import { NextResponse } from "next/server";
import { currentUser, sessionToken } from "@/lib/auth-server";
import { JEDServerError, jedServerRequest } from "@/lib/jed-server";
import { normalizeRole } from "@/lib/roles";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const user = await currentUser();
    if (!user) throw new JEDServerError("Sessão inválida ou expirada.", 401);
    if (normalizeRole(user.role) !== "mentor") throw new JEDServerError("Acesso permitido apenas para Mentores.", 403);
    const input = await request.json();
    const name = String(input?.name || "").trim();
    if (!name) return NextResponse.json({ error: "Informe o nome da turma." }, { status: 400 });
    const token = await sessionToken();
    const created = await jedServerRequest("/api/v1/classes", { method: "POST", token, body: { name, scenario: input?.scenario || {} } });
    return NextResponse.json({ class: created }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const status = error instanceof JEDServerError ? error.status : 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Falha ao criar turma." }, { status });
  }
}
