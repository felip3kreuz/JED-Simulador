import { NextResponse } from "next/server";
import { currentUser, sessionToken } from "@/lib/auth-server";
import { JEDServerError, jedServerRequest } from "@/lib/jed-server";
import { normalizeRole } from "@/lib/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function actor() {
  const user = await currentUser();
  if (!user) throw new JEDServerError("Sessão inválida ou expirada.", 401);
  if (normalizeRole(user.role) !== "aluno") throw new JEDServerError("Acesso permitido apenas para Alunos.", 403);
  return user;
}

function errorResponse(error, fallback) {
  const status = error instanceof JEDServerError ? error.status : 500;
  const response = NextResponse.json({ error: error instanceof Error ? error.message : fallback }, { status });
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export async function GET() {
  try {
    await actor();
    const token = await sessionToken();
    const classes = await jedServerRequest("/api/v1/classes", { token });
    return NextResponse.json({ classes: Array.isArray(classes) ? classes : [] }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return errorResponse(error, "Falha ao carregar turmas.");
  }
}

export async function POST(request) {
  try {
    await actor();
    const input = await request.json();
    const code = String(input?.code || "").trim().toUpperCase();
    if (!code) return NextResponse.json({ error: "Informe o código da turma." }, { status: 400 });
    const token = await sessionToken();
    const joined = await jedServerRequest("/api/v1/classes/join", { method: "POST", token, body: { code } });
    return NextResponse.json({ class: joined }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return errorResponse(error, "Falha ao entrar na turma.");
  }
}
