package main

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestInitialAdminAndPrimaryTransfer(t *testing.T) {
	st := newServerState(t.TempDir())
	first, err := st.createInitialAdmin("Admin Um", "admin1@example.com", "SenhaAdmin123")
	if err != nil {
		t.Fatal(err)
	}
	if first.Role != "admin" || !first.IsPrimaryAdmin || !first.CanInviteMentors {
		t.Fatalf("admin inicial inválido: %#v", first)
	}
	if _, err := st.createInitialAdmin("Admin Dois", "admin2@example.com", "SenhaAdmin123"); err == nil {
		t.Fatal("segundo admin inicial deveria ser rejeitado")
	}
	second, err := st.createAdmin(first, "Admin Dois", "admin2@example.com", "SenhaAdmin456")
	if err != nil {
		t.Fatal(err)
	}
	if second.IsPrimaryAdmin {
		t.Fatal("segundo admin não deveria nascer principal")
	}
	target, err := st.transferPrimaryAdmin(first, second.ID)
	if err != nil {
		t.Fatal(err)
	}
	if !target.IsPrimaryAdmin {
		t.Fatal("transferência não marcou o novo principal")
	}
	if st.Users[first.ID].IsPrimaryAdmin {
		t.Fatal("admin anterior permaneceu principal")
	}
}

func TestMentorDelegationRequiresAdminPermission(t *testing.T) {
	st := newServerState(t.TempDir())
	admin, err := st.createInitialAdmin("Admin", "admin@example.com", "SenhaAdmin123")
	if err != nil {
		t.Fatal(err)
	}
	cred, err := st.createMentorInvitation(admin, "Mentor", "mentor@example.com", "Escola", "")
	if err != nil {
		t.Fatal(err)
	}
	login, err := st.redeemMentorInvitation(cred.Code, "Mentor", "mentor@example.com", "SenhaMentor123", "Escola", "")
	if err != nil {
		t.Fatal(err)
	}
	mentor := login.User
	if mentor.CanInviteMentors {
		t.Fatal("mentor novo não deveria poder credenciar outros mentores")
	}
	if _, err := st.createMentorInvitation(mentor, "Outro", "outro@example.com", "", ""); err == nil {
		t.Fatal("mentor sem permissão conseguiu emitir credencial")
	}
	mentor, err = st.setMentorPermission(admin, mentor.ID, true)
	if err != nil {
		t.Fatal(err)
	}
	if !mentor.CanInviteMentors {
		t.Fatal("permissão não foi concedida")
	}
	if _, err := st.createMentorInvitation(mentor, "Outro", "outro@example.com", "", ""); err != nil {
		t.Fatalf("mentor autorizado deveria emitir credencial: %v", err)
	}
}

func TestDisabledUserCannotAuthenticate(t *testing.T) {
	st := newServerState(t.TempDir())
	admin, err := st.createInitialAdmin("Admin", "admin@example.com", "SenhaAdmin123")
	if err != nil {
		t.Fatal(err)
	}
	student, err := st.createUser("Aluno", "aluno@example.com", "SenhaAluno123", "aluno")
	if err != nil {
		t.Fatal(err)
	}
	if _, ok := st.authenticate(student.Email, "SenhaAluno123"); !ok {
		t.Fatal("aluno ativo deveria autenticar")
	}
	if _, err := st.setUserStatus(admin, student.ID, "disabled"); err != nil {
		t.Fatal(err)
	}
	if _, ok := st.authenticate(student.Email, "SenhaAluno123"); ok {
		t.Fatal("aluno desativado não deveria autenticar")
	}
}

func TestAdminAPI(t *testing.T) {
	st := newServerState(t.TempDir())
	admin, err := st.createInitialAdmin("Admin", "admin@example.com", "SenhaAdmin123")
	if err != nil {
		t.Fatal(err)
	}
	token := st.newSession(admin.ID)
	ts := httptest.NewServer(st.handler())
	defer ts.Close()

	call := func(method, path string, body any, out any) int {
		t.Helper()
		var buf bytes.Buffer
		if body != nil {
			if err := json.NewEncoder(&buf).Encode(body); err != nil {
				t.Fatal(err)
			}
		}
		req, err := http.NewRequest(method, ts.URL+path, &buf)
		if err != nil {
			t.Fatal(err)
		}
		req.Header.Set("Authorization", "Bearer "+token)
		req.Header.Set("Content-Type", "application/json")
		resp, err := ts.Client().Do(req)
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

	var created OnlineUser
	if code := call("POST", "/api/v1/admin/create-admin", map[string]string{
		"name": "Admin Dois", "email": "admin2@example.com", "password": "SenhaAdmin456",
	}, &created); code != http.StatusCreated {
		t.Fatalf("create-admin HTTP %d", code)
	}
	if created.Role != "admin" {
		t.Fatalf("papel inesperado: %q", created.Role)
	}

	var users []OnlineUser
	if code := call("GET", "/api/v1/admin/users", nil, &users); code != http.StatusOK {
		t.Fatalf("users HTTP %d", code)
	}
	if len(users) != 2 {
		t.Fatalf("esperava 2 usuários, recebeu %d", len(users))
	}
}
