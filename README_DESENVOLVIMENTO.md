# JED Simulador v2.0 RC1 — Custo Zero

Objetivo: permitir piloto real sem contratar infraestrutura.

- Persistência autocontida em JSON.
- Gravação atômica.
- Backups automáticos locais por 30 dias.
- Limite de tentativas de login.
- Troca de senha.
- Convites individuais, de uso único, expiram em 30 dias.
- Tutor pode revogar convite pendente.
- ALUNO/TUTOR continuam validados no servidor.
- Funciona no mesmo PC ou em rede local sem mensalidade.


## Ajuste visual RC1.1

- aumento do espaçamento vertical dos itens do menu lateral;
- subtítulos do menu lateral encurtados para evitar compressão visual;
- botões de ação com melhor respiro interno e quebra de linha do texto secundário;
- área de status/tendência do painel reorganizada para reduzir sobreposição visual.

## RC1.2 — correção de navegação

- `← VOLTAR` na Visão Geral retorna à tela inicial.
- `← VOLTAR` em Persona, Lean Canvas, Canais, Ferramentas, Insumos,
  Financeiro, Indicadores, Jornada JED e Modo Tutor retorna à Visão Geral.
- `← VOLTAR` no catálogo, lista de arquivos e JED Online retorna à tela inicial.


## RC1.3 — ícone da janela

- inclusão de `jed_icon.ico` no pacote;
- carregamento do ícone da aplicação em tempo de execução para a janela principal e diálogos;
- melhora a exibição do ícone na barra de tarefas e no título da janela enquanto o programa estiver aberto.

Observação: para o ícone do próprio arquivo `.exe` no Explorer, o ideal futuro é embutir o recurso de ícone no binário. Nesta RC1.3, o foco é o ícone do programa aberto.


## RC1.4 — círculos completos na tela inicial

- substituição dos dois semicírculos do painel inicial por dois círculos completos;
- manutenção do restante da identidade visual da tela de abertura;
- preservação do ícone de janela introduzido na RC1.3.


## RC1.5 — autocadastro de Aluno e Mentor

- Alunos podem criar a própria conta diretamente no JED Online.
- Após o cadastro, o aluno entra na turma pelo código fornecido pelo Mentor.
- Mentores também podem iniciar o próprio cadastro, mas a conta só é criada com uma credencial `MTR-XXXX-XXXX` válida.
- Credenciais de Mentor são emitidas por um Mentor já autorizado, têm uso único e validade de 30 dias.
- O e-mail informado no cadastro de Mentor deve coincidir com o e-mail da credencial.
- Uma conta existente não pode ser promovida silenciosamente de Aluno para Mentor.
- Mentores podem listar e revogar credenciais ainda não utilizadas.
- `tutor` continua aceito internamente para compatibilidade com bases antigas; novas contas privilegiadas usam o papel `mentor`.
- O primeiro Mentor pode ser criado no servidor com:
  `JED_Servidor.exe --create-mentor "Nome" email@exemplo.com "SenhaSegura123"`


## RC1.6 — Administrador e cadeia de confiança

### Papéis
- `admin`: administra a plataforma.
- `mentor`: administra suas turmas e alunos.
- `aluno`: administra a própria simulação.
- `tutor` continua aceito como papel legado equivalente a Mentor.

### Primeiro Administrador
O servidor **não inicia** enquanto não existir uma conta `admin`.
A primeira conta é criada localmente na máquina do servidor:

`JED_Servidor.exe --create-admin`

O programa solicita nome, e-mail, senha e confirmação. No Windows, a senha é digitada sem eco no terminal.
Essa conta recebe `is_primary_admin=true`.

### Recuperação local
Se a senha administrativa for perdida, execute **na máquina do servidor**:

`JED_Servidor.exe --reset-admin-password`

A recuperação exige o e-mail de uma conta Administrador e redefine sua senha, invalidando as sessões anteriores.

### Administração
O painel ADMINISTRADOR permite:
- listar usuários;
- criar outros Administradores;
- ativar/desativar contas;
- credenciar Mentores;
- revogar credenciais MTR;
- conceder ou revogar de um Mentor a permissão de credenciar outros Mentores;
- transferir a função de Administrador Principal para outro Administrador ativo.

### Segurança
- Administrador não possui cadastro público.
- Mentor comum nasce com `can_invite_mentors=false`.
- Administrador sempre pode emitir credenciais MTR.
- Um Mentor só pode emitir credenciais MTR se um Administrador conceder essa permissão.
- Uma conta desativada não autentica e suas sessões ativas são invalidadas.
- O Administrador Principal não pode ser desativado antes de transferir a função principal.
