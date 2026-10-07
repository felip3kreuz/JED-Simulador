package wasmbridge

import (
	"encoding/json"
	"fmt"
	"strconv"
	"sync"

	core "jed-simulador/internal/core"
)

const Version = "2.0-rc1.8-web-final"

type envelope struct {
	OK    bool   `json:"ok"`
	Data  any    `json:"data,omitempty"`
	Error string `json:"error,omitempty"`
}

type Service struct {
	mu     sync.Mutex
	nextID int
	sims   map[int]*core.Simulator
}

func NewService() *Service {
	return &Service{nextID: 1, sims: make(map[int]*core.Simulator)}
}

func encode(v envelope) string {
	b, err := json.Marshal(v)
	if err != nil {
		return `{"ok":false,"error":"erro ao serializar resposta"}`
	}
	return string(b)
}

func ok(data any) string    { return encode(envelope{OK: true, Data: data}) }
func fail(err error) string { return encode(envelope{OK: false, Error: err.Error()}) }

func (s *Service) Info() string {
	return ok(map[string]any{
		"version":   Version,
		"protocol":  1,
		"transport": "json-string",
	})
}

func (s *Service) CreateSimulator(seedText string) string {
	seed, err := strconv.ParseInt(seedText, 10, 64)
	if err != nil {
		return fail(fmt.Errorf("seed inválida: %w", err))
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	id := s.nextID
	s.nextID++
	s.sims[id] = core.NewSimulator(seed)
	return ok(map[string]any{"handle": id, "seed": seedText})
}

func (s *Service) DestroySimulator(handle int) string {
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, exists := s.sims[handle]; !exists {
		return fail(fmt.Errorf("simulador %d não existe", handle))
	}
	delete(s.sims, handle)
	return ok(map[string]any{"destroyed": handle})
}

func decodeCompany(companyJSON string) (*core.Empresa, error) {
	var e core.Empresa
	if err := json.Unmarshal([]byte(companyJSON), &e); err != nil {
		return nil, fmt.Errorf("empresa JSON inválida: %w", err)
	}
	return &e, nil
}

func (s *Service) ProcessWeek(handle int, companyJSON string) string {
	e, err := decodeCompany(companyJSON)
	if err != nil {
		return fail(err)
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	sim, exists := s.sims[handle]
	if !exists {
		return fail(fmt.Errorf("simulador %d não existe", handle))
	}

	record := sim.ProcessWeek(e)
	return ok(struct {
		Empresa  *core.Empresa `json:"empresa"`
		Registro core.Registro `json:"registro"`
	}{Empresa: e, Registro: record})
}

func (s *Service) Indicators(companyJSON string) string {
	e, err := decodeCompany(companyJSON)
	if err != nil {
		return fail(err)
	}
	return ok(core.Indicators(e))
}

func (s *Service) Score(companyJSON string) string {
	e, err := decodeCompany(companyJSON)
	if err != nil {
		return fail(err)
	}
	return ok(core.CalculateScore(e))
}

func (s *Service) Review(companyJSON string) string {
	e, err := decodeCompany(companyJSON)
	if err != nil {
		return fail(err)
	}
	return ok(core.ReviewHypotheses(e))
}

func (s *Service) DigitalChannels() string {
	return ok(core.DigitalChannelSpecs())
}

func (s *Service) DigitalTools() string {
	return ok(core.DigitalToolSpecs())
}
