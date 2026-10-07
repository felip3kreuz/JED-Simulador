import { NextResponse } from "next/server";
import { currentUser, sessionToken } from "@/lib/auth-server";
import { JEDServerError, jedServerRequest } from "@/lib/jed-server";
import { normalizeRole } from "@/lib/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Sessão inválida ou expirada." }, { status: 401 });
    }
    if (normalizeRole(user.role) !== "aluno") {
      return NextResponse.json({ error: "Acesso permitido apenas para Alunos." }, { status: 403 });
    }

    const token = await sessionToken();
    const companies = await jedServerRequest("/api/v1/companies", { token });
    const response = NextResponse.json({ companies: Array.isArray(companies) ? companies : [] });
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch (error) {
    const status = error instanceof JEDServerError ? error.status : 500;
    const response = NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao carregar empresas." },
      { status },
    );
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }
}
