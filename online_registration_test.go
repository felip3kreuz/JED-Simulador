package main

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestMentorCredentialFlow(t *testing.T) {
	st := newServerState(t.TempDir())
	first, err := st.createInitialAdmin("Admin Inicial", "admin1@example.com", "SenhaSegura123")
	if err != nil {
		t.Fatal(err)
	}
	inv, err := st.createMentorInvitation(first, "Nova Mentora", "mentor2@example.com", "Escola JED", "M-002")
	if err != nil {
		t.Fatal(err)
	}
	if inv.Code == "" || inv.Code[:4] != "MTR-" {
		t.Fatalf("código inesperado: %q", inv.Code)
	}
	out, err := st.redeemMentorInvitation(inv.Code, "Nova Mentora", "mentor2@example.com", "OutraSenha123", "Outra Escola", "")
	if err != nil {
		t.Fatal(err)
	}
	if out.User.Role != "mentor" {
		t.Fatalf("papel esperado mentor; recebido %q", out.User.Role)
	}
	if out.User.Institution != "Escola JED" {
		t.Fatalf("instituição da credencial não preservada: %q", out.User.Institution)
	}
	if _, err := st.redeemMentorInvitation(inv.Code, "Outra", "mentor2@example.com", "OutraSenha123", "", ""); err == nil {
		t.Fatal("credencial reutilizada deveria falhar")
	}
}

func TestMentorCredentialRejectsWrongEmail(t *testing.T) {
	st := newServerState(t.TempDir())
	first, err := st.createInitialAdmin("Admin Inicial", "admin1@example.com", "SenhaSegura123")
	if err != nil {
		t.Fatal(err)
	}
	inv, err := st.createMentorInvitation(first, "Nova Mentora", "mentor2@example.com", "", "")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := st.redeemMentorInvitation(inv.Code, "Intruso", "outro@example.com", "OutraSenha123", "", ""); err == nil {
		t.Fatal("e-mail diferente deveria ser rejeitado")
	}
}

func TestStudentSelfRegistrationProfile(t *testing.T) {
	st := newServerState(t.TempDir())
	u, err := st.createUserProfile("Aluno Teste", "aluno@example.com", "SenhaSegura123", "aluno", "", "A-123")
	if err != nil {
		t.Fatal(err)
	}
	if u.Role != "aluno" || u.InstitutionalID != "A-123" {
		t.Fatalf("perfil inesperado: %#v", u)
	}
}

func postJSON(t *testing.T, client *http.Client, url string, body any, out any) int {
	t.Helper()
	b, err := json.Marshal(body)
	if err != nil {
		t.Fatal(err)
	}
	resp, err := client.Post(url, "application/json", bytes.NewReader(b))
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	if out != nil {
		if err := json.NewDecoder(resp.Body).Decode(out); err != nil {
			t.Fatal(err)
		}
	}
	return resp.StatusCode
}

func TestRegistrationAPIFlow(t *testing.T) {
	st := newServerState(t.TempDir())
	first, err := st.createInitialAdmin("Admin Inicial", "admin1@example.com", "SenhaSegura123")
	if err != nil {
		t.Fatal(err)
	}
	cred, err := st.createMentorInvitation(first, "Mentora Dois", "mentor2@example.com", "Escola JED", "M-002")
	if err != nil {
		t.Fatal(err)
	}

	ts := httptest.NewServer(st.handler())
	defer ts.Close()

	var student OnlineLoginResponse
	status := postJSON(t, ts.Client(), ts.URL+"/api/v1/register/student", map[string]string{
		"name": "Aluno Um", "email": "aluno1@example.com", "password": "SenhaAluno123",
		"institutional_id": "A-001",
	}, &student)
	if status != http.StatusCreated {
		t.Fatalf("cadastro de aluno retornou HTTP %d", status)
	}
	if student.User.Role != "aluno" || student.Token == "" {
		t.Fatalf("resposta de aluno inválida: %#v", student)
	}

	var mentor OnlineLoginResponse
	status = postJSON(t, ts.Client(), ts.URL+"/api/v1/register/mentor", map[string]string{
		"name": "Mentora Dois", "email": "mentor2@example.com", "password": "SenhaMentor123",
		"institution": "Escola JED", "institutional_id": "M-002", "credential_code": cred.Code,
	}, &mentor)
	if status != http.StatusCreated {
		t.Fatalf("cadastro de mentor retornou HTTP %d", status)
	}
	if mentor.User.Role != "mentor" || mentor.Token == "" {
		t.Fatalf("resposta de mentor inválida: %#v", mentor)
	}
}

func TestStudentInvitationCreatesPasswordAndPreservesInstitutionalID(t *testing.T) {
	st := newServerState(t.TempDir())
	mentor, err := st.createUser("Mentor Teste", "mentor@example.com", "SenhaMentor123", "mentor")
	if err != nil {
		t.Fatal(err)
	}
	class := OnlineClass{ID: "tur-test", Name: "Turma Teste", TutorID: mentor.ID, JoinCode: "ABC123", StudentIDs: []string{}, Scenario: cenariosBase[0]}
	st.Classes[class.ID] = class
	inv, err := st.createInvitation(mentor, class.ID, "Aluno Convidado", "convite@example.com", "MAT-009")
	if err != nil {
		t.Fatal(err)
	}
	out, err := st.redeemInvitation(inv.Code, "SenhaAluno123")
	if err != nil {
		t.Fatal(err)
	}
	if out.User.Role != "aluno" {
		t.Fatalf("papel esperado aluno; recebido %q", out.User.Role)
	}
	if out.Token == "" {
		t.Fatal("ativação do convite deve abrir uma sessão")
	}
	if out.User.InstitutionalID != "MAT-009" {
		t.Fatalf("ID institucional do convite não preservado: %q", out.User.InstitutionalID)
	}
	joined := st.Classes[class.ID]
	found := false
	for _, id := range joined.StudentIDs {
		if id == out.User.ID {
			found = true
			break
		}
	}
	if !found {
		t.Fatal("Aluno ativado pelo convite deveria estar vinculado à turma")
	}
}
