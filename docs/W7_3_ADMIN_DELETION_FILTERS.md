# W7.3 — Exclusão administrativa e filtros do Mentor

## Administrador Principal

Somente a conta marcada como `is_primary_admin=true` pode executar exclusões definitivas. A permissão acompanha a função de Administrador Principal; não é baseada em um endereço de e-mail hard-coded.

### Exclusão de usuários

- Aluno: remove conta, sessões, vínculos de turma, convites associados e empreendimentos persistidos do Aluno.
- Mentor: só pode ser excluído depois que todas as turmas sob sua responsabilidade forem excluídas; cenários personalizados e convites associados ao Mentor são removidos com a conta.
- Administrador secundário: pode ser excluído pelo Administrador Principal.
- Administrador Principal: não pode excluir a própria conta.

A interface exige que o operador digite `EXCLUIR` antes de confirmar.

### Exclusão de turmas

A turma é removida, bem como convites vinculados a ela. Alunos não são apagados. Empreendimentos da turma são preservados no servidor e passam a ficar sem vínculo de turma (`class_id`/`turma_id` vazios).

## Mentor

### Resultados

Dois filtros podem ser usados em conjunto:

- Turma: todas ou uma turma específica.
- Avaliação: todas, APROVADO, PENDENTE ou REPROVADO.

`PENDENTE` significa empreendimento sem `approval_status`.

### Turmas

A lista de turmas pode ser filtrada para mostrar somente turmas que contenham pelo menos um empreendimento APROVADO, PENDENTE ou REPROVADO. Cada cartão exibe os contadores dos três estados.
