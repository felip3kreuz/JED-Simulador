package main

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestOX782ProvisionedPasswordAndLegacyCompatibility(t *testing.T) {
	st := newServerState(t.TempDir())
	admin, err := st.createInitialAdmin("Admin", "admin-ox@example.com", "SenhaAdmin123")
	if err != nil {
		t.Fatal(err)
	}
	u, err := st.createProvisionedUserForClass(admin, "Aluno", "aluno-ox@example.com", "aluno", "", "", "")
	if err != nil {
		t.Fatal(err)
	}
	if defaultProvisionedPassword != "abcd1234" {
		t.Fatal("senha inicial incorreta")
	}
	if !u.MustChangePassword {
		t.Fatal("troca não obrigatória")
	}
	if _, ok := st.authenticate(u.Email, "abcd1234"); !ok {
		t.Fatal("senha inicial nova não autentica")
	}
	if _, ok := st.authenticate(u.Email, "acbd1234"); ok {
		t.Fatal("senha legada não pode abrir conta nova")
	}
	older, err := st.createUser("Antigo", "antigo-ox@example.com", "acbd1234", "aluno")
	if err != nil {
		t.Fatal(err)
	}
	if _, ok := st.authenticate(older.Email, "acbd1234"); !ok {
		t.Fatal("senha existente alterada sem consentimento")
	}
}

func TestOX782EvaluationHistoryIsolationAndNotifications(t *testing.T) {
	root := t.TempDir()
	st := newServerState(root)
	admin, err := st.createInitialAdmin("Admin", "admin-eval@example.com", "SenhaAdmin123")
	if err != nil {
		t.Fatal(err)
	}
	mentor1, err := st.createUser("Mentor Um", "mentor1-eval@example.com", "SenhaMentor123", "mentor")
	if err != nil {
		t.Fatal(err)
	}
	mentor2, err := st.createUser("Mentor Dois", "mentor2-eval@example.com", "SenhaMentor123", "mentor")
	if err != nil {
		t.Fatal(err)
	}
	class, err := st.createAdminClass(admin, "Turma de Teste", mentor1.ID)
	if err != nil {
		t.Fatal(err)
	}
	student, err := st.createUser("Aluno", "aluno-eval@example.com", "SenhaAluno123", "aluno")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := st.assignStudentClass(admin, student.ID, class.ID); err != nil {
		t.Fatal(err)
	}
	ts := httptest.NewServer(st.handler())
	defer ts.Close()
	call := func(method, path, token string, input any, out any) int {
		t.Helper()
		var b bytes.Buffer
		if input != nil {
			if err := json.NewEncoder(&b).Encode(input); err != nil {
				t.Fatal(err)
			}
		}
		req, err := http.NewRequest(method, ts.URL+path, &b)
		if err != nil {
			t.Fatal(err)
		}
		req.Header.Set("Authorization", "Bearer "+token)
		req.Header.Set("Content-Type", "application/json")
		res, err := ts.Client().Do(req)
		if err != nil {
			t.Fatal(err)
		}
		defer res.Body.Close()
		if out != nil {
			if err := json.NewDecoder(res.Body).Decode(out); err != nil {
				t.Fatal(err)
			}
		}
		return res.StatusCode
	}
	tokenStudent, token1, token2 := st.newSession(student.ID), st.newSession(mentor1.ID), st.newSession(mentor2.ID)
	if code := call("PUT", "/api/v1/companies/c1", tokenStudent, map[string]any{"company": map[string]any{"nome": "Negócio Teste"}}, nil); code != 200 {
		t.Fatalf("PUT HTTP %d", code)
	}
	key := student.ID + ":c1"
	evaluate := func(status string, withReservations bool, comment, requestID string) map[string]any {
		return map[string]any{"company_id": key, "status": status, "com_ressalvas": withReservations, "comment": comment, "request_id": requestID}
	}
	url := "/api/v1/mentor/companies/evaluate"
	if code := call("POST", url, token2, evaluate("aprovado", false, "", "outsider"), nil); code != 403 {
		t.Fatalf("mentor não atribuído deveria receber 403: %d", code)
	}
	if code := call("POST", url, tokenStudent, evaluate("aprovado", false, "", "student"), nil); code != 403 {
		t.Fatalf("aluno não pode avaliar: %d", code)
	}
	if code := call("POST", url, token1, evaluate("aprovado", true, "", "invalid"), nil); code != 400 {
		t.Fatalf("ressalvas sem comentário deveriam falhar: %d", code)
	}
	if code := call("POST", url, token1, evaluate("reprovado", true, "comentário", "invalid2"), nil); code != 400 {
		t.Fatalf("reprovado com ressalvas deveria falhar: %d", code)
	}
	var approved RemoteCompany
	if code := call("POST", url, token1, evaluate("aprovado", true, "Revisar o público-alvo.", "review-one"), &approved); code != 200 {
		t.Fatalf("primeira avaliação HTTP %d", code)
	}
	if approved.ApprovalStatus != "aprovado" || !approved.ApprovalWithReservations || len(approved.EvaluationHistory) != 1 {
		t.Fatalf("parecer inválido: %#v", approved)
	}
	if code := call("POST", url, token1, evaluate("aprovado", true, "Revisar o público-alvo.", "review-one"), nil); code != 200 {
		t.Fatalf("retry HTTP %d", code)
	}
	if len(st.Companies[key].EvaluationHistory) != 1 || len(st.Notifications) != 1 {
		t.Fatal("reenvio duplicou histórico ou notificação")
	}
	if code := call("POST", url, token1, evaluate("reprovado", false, "Análise insuficiente.", "review-two"), nil); code != 200 {
		t.Fatalf("segundo parecer HTTP %d", code)
	}
	if len(st.Companies[key].EvaluationHistory) != 2 || len(st.Notifications) != 2 {
		t.Fatal("revisões não persistidas")
	}
	var notices []OnlineNotification
	if code := call("GET", "/api/v1/notifications", tokenStudent, nil, &notices); code != 200 || len(notices) != 2 {
		t.Fatalf("notificações do aluno: HTTP %d, %d itens", code, len(notices))
	}
	var mentorNotices []OnlineNotification
	if code := call("GET", "/api/v1/notifications", token2, nil, &mentorNotices); code != 200 || len(mentorNotices) != 0 {
		t.Fatalf("vazamento de notificação HTTP %d itens=%d", code, len(mentorNotices))
	}
	id := notices[0].ID
	if code := call("POST", "/api/v1/notifications/"+id+"/read", token2, nil, nil); code != 404 {
		t.Fatalf("mentor não pode ler notificação de aluno: HTTP %d", code)
	}
	if code := call("POST", "/api/v1/notifications/"+id+"/read", tokenStudent, nil, nil); code != 200 {
		t.Fatalf("aluno não conseguiu marcar: HTTP %d", code)
	}
	reloaded := newServerState(root)
	if err := reloaded.load(); err != nil {
		t.Fatal(err)
	}
	if len(reloaded.Companies[key].EvaluationHistory) != 2 || reloaded.Notifications[id].ReadAt == "" {
		t.Fatal("histórico e notificações não sobreviveram ao reload")
	}
	if len(reloaded.AuditEvents) != 2 {
		t.Fatalf("auditoria: eventos=%d", len(reloaded.AuditEvents))
	}
}

func TestOX782TransferCreatesOneStudentNoticeAndRollback(t *testing.T) {
	st := newServerState(t.TempDir())
	admin, err := st.createInitialAdmin("Admin", "admin-transfer-ox@example.com", "SenhaAdmin123")
	if err != nil {
		t.Fatal(err)
	}
	mentor, err := st.createUser("Mentor", "mentor-transfer-ox@example.com", "SenhaMentor123", "mentor")
	if err != nil {
		t.Fatal(err)
	}
	oldClass, err := st.createAdminClass(admin, "Turma Um", mentor.ID)
	if err != nil {
		t.Fatal(err)
	}
	newClass, err := st.createAdminClass(admin, "Turma Dois", mentor.ID)
	if err != nil {
		t.Fatal(err)
	}
	student, err := st.createUser("Aluno", "aluno-transfer-ox@example.com", "SenhaAluno123", "aluno")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := st.assignStudentClass(admin, student.ID, oldClass.ID); err != nil {
		t.Fatal(err)
	}
	if len(st.Notifications) != 0 {
		t.Fatal("primeira matrícula não deve ser notificada como transferência")
	}
	moved, err := st.assignStudentClass(admin, student.ID, newClass.ID)
	if err != nil {
		t.Fatal(err)
	}
	if moved.EnrollmentID != "T2A1" || len(moved.Enrollments) != 2 || moved.Enrollments[0].EndedAt == "" {
		t.Fatalf("histórico de transferência incorreto: %#v", moved)
	}
	if len(st.Notifications) != 1 || st.AuditEvents[0].Action != "student_transferred" {
		t.Fatal("transferência sem notificação ou auditoria")
	}
	if _, err := st.assignStudentClass(admin, student.ID, newClass.ID); err != nil {
		t.Fatal(err)
	}
	if len(st.Notifications) != 1 {
		t.Fatal("matrícula idêntica duplicou notificação")
	}
	previous := st.Users[student.ID]
	beforeNext := st.Classes[oldClass.ID].NextStudentNumber
	st.root = "/dev/null/not-a-directory"
	if _, err := st.assignStudentClass(admin, student.ID, oldClass.ID); err == nil {
		t.Fatal("esperava falha ao persistir")
	}
	if st.Users[student.ID].EnrollmentID != previous.EnrollmentID || len(st.Notifications) != 1 {
		t.Fatal("falha de disco alterou matrícula/notificações")
	}
	if st.Classes[oldClass.ID].NextStudentNumber != beforeNext {
		t.Fatal("sequência de matrículas avançou após falha de disco")
	}
}

// OX-78-2: a class may be created before a Mentor exists, but student enrollment
// remains blocked until a valid Mentor has been explicitly designated.
func TestOX782AdminCreatesClassWithoutMentorAndAssignsLater(t *testing.T) {
	root := t.TempDir()
	st := newServerState(root)
	admin, err := st.createInitialAdmin("Admin", "admin-classes@example.com", "SenhaAdmin123")
	if err != nil {
		t.Fatal(err)
	}
	student, err := st.createUser("Aluno", "student-classes@example.com", "SenhaAluno123", "aluno")
	if err != nil {
		t.Fatal(err)
	}
	mentor, err := st.createUser("Mentor", "mentor-classes@example.com", "SenhaMentor123", "mentor")
	if err != nil {
		t.Fatal(err)
	}

	st.NextClassNumber = 25
	cl, err := st.createAdminClass(admin, "Turma Nova", "")
	if err != nil {
		t.Fatal(err)
	}
	if cl.Number != 25 || cl.TutorID != "" {
		t.Fatalf("turma inicial incorreta: %#v", cl)
	}
	if _, err := st.createAdminClass(admin, "turma nova", ""); err == nil {
		t.Fatal("nomes de turma duplicados devem ser rejeitados")
	}
	if _, err := st.assignStudentClass(admin, student.ID, cl.ID); err == nil {
		t.Fatal("matrícula sem Mentor aceita")
	}
	if st.Users[student.ID].CurrentClassID != "" || st.Classes[cl.ID].NextStudentNumber != 0 {
		t.Fatal("matrícula inválida modificou estado")
	}
	if _, err := st.createProvisionedUserForClass(admin, "Novo aluno", "novo-aluno-classes@example.com", "aluno", "", "", cl.ID); err == nil {
		t.Fatal("cadastro direto na turma sem Mentor aceito")
	}
	if _, exists := st.Users["novo-aluno-classes@example.com"]; exists {
		t.Fatal("usuário criado apesar da turma incompleta")
	}
	if _, err := st.assignAdminClassMentor(student, cl.ID, mentor.ID); err == nil {
		t.Fatal("aluno conseguiu designar Mentor")
	}
	if _, err := st.assignAdminClassMentor(admin, cl.ID, student.ID); err == nil {
		t.Fatal("aluno foi aceito como Mentor")
	}
	if _, err := st.assignAdminClassMentor(admin, cl.ID, "mentor-inexistente"); err == nil {
		t.Fatal("Mentor inexistente aceito")
	}

	updated, err := st.assignAdminClassMentor(admin, cl.ID, mentor.ID)
	if err != nil {
		t.Fatal(err)
	}
	if updated.TutorID != mentor.ID || updated.Number != 25 {
		t.Fatalf("designação incorreta: %#v", updated)
	}
	if _, err := st.assignAdminClassMentor(admin, cl.ID, mentor.ID); err == nil {
		t.Fatal("turma já designada pode ser redesignda")
	}
	student, err = st.assignStudentClass(admin, student.ID, cl.ID)
	if err != nil {
		t.Fatal(err)
	}
	if student.EnrollmentID != "T25A1" {
		t.Fatalf("matrícula deveria ser T25A1, obtida %s", student.EnrollmentID)
	}
	cl2, err := st.createAdminClass(admin, "Turma Seguinte", "")
	if err != nil || cl2.Number != 26 {
		t.Fatalf("numeração não monotônica: %#v, %v", cl2, err)
	}
	reloaded := newServerState(root)
	if err := reloaded.load(); err != nil {
		t.Fatal(err)
	}
	if reloaded.Classes[cl.ID].TutorID != mentor.ID || reloaded.Classes[cl2.ID].TutorID != "" || reloaded.Users[student.ID].EnrollmentID != "T25A1" {
		t.Fatal("turmas ou matrícula não persistiram")
	}
}

func TestOX782ClassCreationAndMentorAssignmentHTTPAuthorization(t *testing.T) {
	st := newServerState(t.TempDir())
	admin, err := st.createInitialAdmin("Admin", "admin-classes-http@example.com", "SenhaAdmin123")
	if err != nil {
		t.Fatal(err)
	}
	mentor, err := st.createUser("Mentor", "mentor-classes-http@example.com", "SenhaMentor123", "mentor")
	if err != nil {
		t.Fatal(err)
	}
	server := httptest.NewServer(st.handler())
	defer server.Close()
	post := func(token, path string, body any, out any) int {
		t.Helper()
		var data bytes.Buffer
		if err := json.NewEncoder(&data).Encode(body); err != nil {
			t.Fatal(err)
		}
		req, _ := http.NewRequest(http.MethodPost, server.URL+path, &data)
		req.Header.Set("Content-Type", "application/json")
		if token != "" {
			req.Header.Set("Authorization", "Bearer "+token)
		}
		resp, err := server.Client().Do(req)
		if err != nil {
			t.Fatal(err)
		}
		defer resp.Body.Close()
		if out != nil && resp.StatusCode < 300 {
			if err := json.NewDecoder(resp.Body).Decode(out); err != nil {
				t.Fatal(err)
			}
		}
		return resp.StatusCode
	}
	adminToken, mentorToken := st.newSession(admin.ID), st.newSession(mentor.ID)
	request := map[string]string{"name": "Turma HTTP", "mentor_id": ""}
	if code := post(mentorToken, "/api/v1/admin/classes", request, nil); code != 403 {
		t.Fatalf("mentor criou turma: HTTP %d", code)
	}
	if code := post("", "/api/v1/admin/classes", request, nil); code != 401 {
		t.Fatalf("criação sem sessão: HTTP %d", code)
	}
	var created OnlineClass
	if code := post(adminToken, "/api/v1/admin/classes", request, &created); code != 201 || created.TutorID != "" {
		t.Fatalf("admin criou turma sem Mentor: HTTP %d, %#v", code, created)
	}
	assignment := map[string]string{"class_id": created.ID, "mentor_id": mentor.ID}
	if code := post(mentorToken, "/api/v1/admin/classes/assign-mentor", assignment, nil); code != 403 {
		t.Fatalf("mentor designou a si próprio: HTTP %d", code)
	}
	var updated OnlineClass
	if code := post(adminToken, "/api/v1/admin/classes/assign-mentor", assignment, &updated); code != 200 || updated.TutorID != mentor.ID {
		t.Fatalf("admin designou Mentor: HTTP %d, %#v", code, updated)
	}
}

func TestOX782ClassOperationsRollbackOnSaveFailure(t *testing.T) {
	st := newServerState(t.TempDir())
	admin, err := st.createInitialAdmin("Admin", "admin-classes-rollback@example.com", "SenhaAdmin123")
	if err != nil {
		t.Fatal(err)
	}
	mentor, err := st.createUser("Mentor", "mentor-classes-rollback@example.com", "SenhaMentor123", "mentor")
	if err != nil {
		t.Fatal(err)
	}
	cl, err := st.createAdminClass(admin, "Turma Persistida", "")
	if err != nil {
		t.Fatal(err)
	}
	counter := st.NextClassNumber
	st.root = "/dev/null/not-a-directory"
	if _, err := st.createAdminClass(admin, "Turma Falha", ""); err == nil {
		t.Fatal("esperava falha de gravação na criação")
	}
	if st.NextClassNumber != counter || len(st.Classes) != 1 {
		t.Fatal("falha na criação corrompeu a sequência ou turmas")
	}
	if _, err := st.assignAdminClassMentor(admin, cl.ID, mentor.ID); err == nil {
		t.Fatal("esperava falha de gravação na designação")
	}
	if st.Classes[cl.ID].TutorID != "" {
		t.Fatal("falha de designação alterou o Mentor")
	}
}
