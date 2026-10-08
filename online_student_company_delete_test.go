package main

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestStudentDeletesOnlyOwnCompany(t *testing.T) {
	root := t.TempDir()
	st := newServerState(root)
	alice, err := st.createUser("Alice", "alice-delete@example.com", "SenhaAluno123", "aluno")
	if err != nil {
		t.Fatal(err)
	}
	bob, err := st.createUser("Bob", "bob-delete@example.com", "SenhaAluno123", "aluno")
	if err != nil {
		t.Fatal(err)
	}
	ts := httptest.NewServer(st.handler())
	defer ts.Close()
	tokenAlice, tokenBob := st.newSession(alice.ID), st.newSession(bob.ID)

	request := func(method, path, token string, body any) int {
		t.Helper()
		var encoded []byte
		if body != nil {
			encoded, _ = json.Marshal(body)
		}
		req, err := http.NewRequest(method, ts.URL+path, bytes.NewReader(encoded))
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
		return resp.StatusCode
	}
	company := func(name string) any { return map[string]any{"company": map[string]any{"nome": name}} }
	if code := request("PUT", "/api/v1/companies/a1", tokenAlice, company("Empresa Alice")); code != 200 {
		t.Fatalf("PUT Alice HTTP %d", code)
	}
	if code := request("PUT", "/api/v1/companies/b1", tokenBob, company("Empresa Bob")); code != 200 {
		t.Fatalf("PUT Bob HTTP %d", code)
	}
	if code := request("DELETE", "/api/v1/companies/b1", tokenAlice, nil); code != 404 {
		t.Fatalf("Alice tentou excluir empresa de Bob, HTTP %d", code)
	}
	if code := request("DELETE", "/api/v1/companies/a1", tokenAlice, nil); code != 200 {
		t.Fatalf("Alice deveria excluir a própria empresa, HTTP %d", code)
	}
	if code := request("DELETE", "/api/v1/companies/a1", tokenAlice, nil); code != 404 {
		t.Fatalf("Exclusão repetida deve retornar 404, HTTP %d", code)
	}
	if _, ok := st.Companies[bob.ID+":b1"]; !ok {
		t.Fatal("A empresa de Bob foi indevidamente removida")
	}
	if _, ok := st.Companies[alice.ID+":a1"]; ok {
		t.Fatal("A empresa de Alice permaneceu na memória")
	}
	reloaded := newServerState(root)
	if err := reloaded.load(); err != nil {
		t.Fatal(err)
	}
	if _, ok := reloaded.Companies[alice.ID+":a1"]; ok {
		t.Fatal("Empresa de Alice permaneceu após recarregar banco")
	}
	if _, ok := reloaded.Companies[bob.ID+":b1"]; !ok {
		t.Fatal("Empresa de Bob desapareceu após recarregar banco")
	}
}
