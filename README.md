# JED Simulador RC1.8 — W7.3.1

Correção de integração para o erro de CI da W7.3.

Aplique estes arquivos sobre a branch W7.3 que falhou no GitHub Actions.

O problema corrigido é a sobreposição entre a atualização de exclusão administrativa/filtros e a atualização de turmas centralizadas: os testes de exclusão permaneceram, mas os métodos do servidor haviam sido removidos do `online_server.go`.

Esta revisão mantém os dois conjuntos de funcionalidades.

Validação executada no pacote consolidado:

- `go test ./...`
- `go run . --self-test`
- build Linux amd64
- build Windows amd64
- build WebAssembly
- smoke test WebAssembly
