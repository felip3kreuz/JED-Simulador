import { NextResponse } from "next/server";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/session";
import { JEDServerError, jedServerRequest } from "@/lib/jed-server";
import { normalizeRole, roleHome } from "@/lib/roles";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const input = await request.json();
    const name = String(input?.name || "").trim();
    const email = String(input?.email || "").trim().toLowerCase();
    const password = String(input?.password || "");
    const institutional_id = String(input?.institutional_id || "").trim();
    if (!name || !email) return NextResponse.json({ error: "Informe nome e e-mail." }, { status: 400 });
    if (password.length < 8) return NextResponse.json({ error: "A senha deve ter pelo menos 8 caracteres." }, { status: 400 });
    const login = await jedServerRequest("/api/v1/register/student", { method: "POST", body: { name, email, password, institutional_id } });
    const user = { ...login.user, role: normalizeRole(login.user?.role) };
    const response = NextResponse.json({ user, redirectTo: roleHome(user.role) }, { status: 201 });
    response.headers.set("Cache-Control", "private, no-store");
    response.cookies.set(SESSION_COOKIE, login.token, sessionCookieOptions());
    return response;
  } catch (error) {
    const status = error instanceof JEDServerError ? error.status : 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Falha ao cadastrar Aluno." }, { status });
  }
}
