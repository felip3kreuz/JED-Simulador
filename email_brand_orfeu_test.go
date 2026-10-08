package main

import (
	"strings"
	"testing"
)

func TestOrfeuBrandAndURLInProvisioningEmail(t *testing.T) {
	t.Setenv("JED_EMAIL_BRAND", "Orfeu")
	t.Setenv("JED_PUBLIC_URL", "https://orfeu.exemplo.org")
	subject, body := accountCreatedEmail(OnlineUser{
		Name: "Aluno Teste", Email: "aluno@exemplo.org", Role: "aluno",
	}, "senha-temporaria")
	if subject != "Seu cadastro no Orfeu" {
		t.Fatalf("assunto inesperado: %s", subject)
	}
	for _, want := range []string{
		"Seu cadastro no Orfeu", "https://orfeu.exemplo.org",
		"senha-temporaria", "\nOrfeu\n",
	} {
		if !strings.Contains(body, want) {
			t.Errorf("texto ausente: %q", want)
		}
	}
	if strings.Contains(body, "JED Simulador") {
		t.Error("marca antiga no corpo")
	}
}

func TestDefaultBrandKeepsLegacyEmail(t *testing.T) {
	t.Setenv("JED_EMAIL_BRAND", "")
	subject, body := accountCreatedEmail(OnlineUser{Name: "Aluno", Role: "aluno"}, "temporaria")
	if subject != "Seu cadastro no JED Simulador" || !strings.Contains(body, "JED Simulador") {
		t.Fatal("comportamento legado alterado")
	}
}

func TestOrfeuBrandInMentorCredentialEmail(t *testing.T) {
	t.Setenv("JED_EMAIL_BRAND", "Orfeu")
	subject, body := mentorCredentialEmail(serverMentorInvitation{Name: "Mentor Teste", Code: "MTR-1234", Institution: "Teste"})
	if subject != "Convite para acessar o Orfeu como Mentor" || !strings.Contains(body, "Abra o Orfeu") {
		t.Fatalf("e-mail do mentor nao customizado: %q", subject)
	}
}

func TestOrfeuFromNameWhenNotExplicitlySet(t *testing.T) {
	t.Setenv("JED_EMAIL_BRAND", "Orfeu")
	t.Setenv("JED_SMTP_CONFIG", t.TempDir()+"/inexistente.json")
	t.Setenv("JED_SMTP_HOST", "localhost")
	t.Setenv("JED_SMTP_FROM", "contato@exemplo.org")
	t.Setenv("JED_SMTP_FROM_NAME", "")
	cfg, ok, err := loadServerEmailConfig()
	if err != nil || !ok {
		t.Fatalf("falha de config: %v", err)
	}
	if cfg.FromName != "Orfeu" {
		t.Fatalf("nome do remetente = %q", cfg.FromName)
	}
}
