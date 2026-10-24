# Serviço Certo — contexto do projeto

> Fonte de verdade para agentes e desenvolvedores. Atualize este arquivo quando
> uma decisão estrutural mudar.

## Visão geral

**Serviço Certo** é um sistema open source de Ordens de Serviço para pequenos
negócios. O objetivo é registrar serviços prestados, emitir nota e gerenciar
estoque. O projeto também é usado para discutir uma visão pragmática de IA no
desenvolvimento: velocidade, qualidade e segurança.

O repositório é um **monorepo** com API NestJS e frontend Next.js. O backend
segue **Clean Architecture** em um modular monolith.

## Stack

| Área      | Tecnologia                                                    |
| --------- | ------------------------------------------------------------- |
| Monorepo  | pnpm workspaces + Turborepo                                   |
| Backend   | NestJS 12 (ESM-only), TypeScript 6.0.3                        |
| Frontend  | Next.js 16 (App Router), React 19, Tailwind CSS v4, shadcn/ui |
| Banco     | Knex 3 + SQLite (dev/testes) + PostgreSQL (produção)          |
| Auth      | JWT (`jose`), argon2id, cookie httpOnly                       |
| Validação | Zod 4 em `packages/contracts` + pipe próprio na API           |
| Testes    | Vitest 5; Supertest nos e2e                                   |
| Qualidade | ESLint 10 flat config, Prettier, TypeScript                   |

## Estrutura

```text
apps/
├─ api/                         # NestJS
│  └─ src/
│     ├─ app.module.ts
│     ├─ app.setup.ts           # prefixo v1, pipes, filtro, CORS, Swagger
│     ├─ database/              # Knex, migrations, seeds, CLI
│     ├─ health/
│     ├─ modules/
│     │  ├─ identity/           # tenants, accounts, auth, password reset
│     │  ├─ customers/          # CRUD de clientes
│     │  ├─ products/           # CRUD de produtos
│     │  ├─ services/           # CRUD de serviços
│     │  └─ service-orders/     # CRUD de ordens de serviço
│     └─ shared/                # ports, erros, filtros, IDs, UoW, database helpers
├─ web/                         # Next.js (apenas placeholder por enquanto)
packages/
├─ config/                      # presets de TS, ESLint, Prettier, tema Tailwind
└─ contracts/                   # schemas Zod e tipos compartilhados (ESM)
infra/docker-compose.yml        # PostgreSQL + Mailpit
```

## Comandos

```bash
pnpm install
cp .env.example .env
pnpm db:migrate          # SQLite local em apps/api/.data/dev.sqlite
pnpm dev                 # API :3001 + web :3000
pnpm lint
pnpm typecheck
pnpm test                # todos os pacotes via Turbo
pnpm test:unit           # testes unitários da API
pnpm test:e2e            # testes e2e da API
pnpm build
pnpm format
```

Os e2e rodam em SQLite `:memory:` por padrão. Para rodar contra PostgreSQL:

```bash
DATABASE_CLIENT=pg \
DATABASE_URL=postgres://servico_certo:servico_certo@localhost:5432/servico_certo \
pnpm test:e2e
```

Produção:

```bash
pnpm build
NODE_ENV=production DATABASE_URL=postgres://... pnpm db:migrate:prod
```

Migrations também têm `db:rollback`, `db:seed` e variantes `:prod`.
Docker: `docker compose -f infra/docker-compose.yml up -d` sobe PostgreSQL e
Mailpit (SMTP 1025, UI http://localhost:8025).

## Regras de arquitetura (Clean Architecture)

Cada contexto em `apps/api/src/modules/<contexto>` tem:

```text
domain/           # entidades, VOs, erros e interfaces de repositório — TS puro
application/      # use cases, ports, tipos de aplicação
infrastructure/   # Knex, argon2, JWT, mailers, mappers
presentation/     # controllers, guards, decorators, presenters, Swagger
<contexto>.module.ts
```

Regra de dependência:

```text
presentation ──▶ application ──▶ domain
infrastructure ─▶ application ──▶ domain
```

- `domain` **não** importa Nest, Knex, zod ou detalhes externos.
- `application` não importa infraestrutura nem presentation.
- `infrastructure` e `presentation` dependem para dentro.
- A composição/DI acontece no `<contexto>.module.ts`.
- Comunicação entre contextos deve usar ports/eventos, não importar a
  infraestrutura de outro contexto.

### Shared

- `src/shared/application/ports`: `Clock`, `IdGenerator`, `UnitOfWork`.
- `src/shared/infrastructure`: `SystemClock`, `UuidV7Generator`,
  `KnexUnitOfWork` (AsyncLocalStorage).
- `src/shared/shared.module.ts` é global.
- `DatabaseModule` é global e fornece o token `KNEX`.
- `src/shared/database`: helpers de data, `escapeLike`, unique violation.
- `src/shared/errors/app-error.ts`: base dos erros de domínio/aplicação.
- `src/shared/filters/all-exceptions.filter.ts`: envelope de erro e mapa de
  códigos para HTTP.
- `src/shared/ids/public-id.ts`: codec de IDs públicos.

## Multi-tenancy

- Todo dado de negócio tem `tenant_id`.
- O `tenantId` **sempre** vem do JWT, nunca do body/query/path.
- Repositórios são escopados por tenant; consultas cross-tenant devem retornar
  `404`.
- O login resolve o tenant pelo `domain` (slug único do tenant).
- E-mail é único **por tenant**.
- `domain` do tenant é um slug lowercase (3–63, `[a-z0-9-]`, reservados:
  `www`, `api`, `app`, `admin`, `docs`, `mail`, `support`, `billing`, `status`).

## IDs públicos

Formato:

```text
{prefixo}_{base64url(16 bytes do UUIDv7)}
```

- Payload de 22 caracteres; ID final de 26 com prefixo.
- Prefixos atuais em `PUBLIC_ID_PREFIXES`:
  - `ten` → tenant
  - `acc` → account
  - `cus` → customer
  - `prd` → product
  - `srv` → service
  - `ord` → service order
- Banco guarda UUIDv7 puro; o prefixo existe apenas na borda HTTP.
- `encodePublicId`/`decodePublicId` em `src/shared/ids/public-id.ts`.
- `decodePublicId` valida prefixo, base64url canônico, UUIDv7 e variante.
- Não usar `split('_')`: o payload base64url pode conter `_`.
- Nos controllers: `@Param('id', new ZodValidationPipe(<resource>IdSchema))` e
  `decodePublicId(...)`.

## Autenticação e identidade

### Modelo

- `tenants`: id, name, domain, timestamps.
- `accounts`: id, tenant_id, name, email, password_hash, status, timestamps.
- Sem papéis/roles nesta etapa: todas as contas do tenant são equivalentes.
- E-mail único por tenant (`unique (tenant_id, email)`).
- Senha com **argon2id** (memória 19456 KiB, timeCost 2, parallelism 1).
- `PasswordHash` exige prefixo `$argon2id$`.

### Sessão

- Access token JWT HS256, 15 min, claims `sub` (accountId) e `tid` (tenantId),
  com `jti`.
- Refresh token opaco (32 bytes base64url), salvo como SHA-256, validade 7 dias,
  em cookie `httpOnly`, `secure` em produção, `sameSite=lax`, path `/v1/auth`.
- Rotação de refresh e detecção de reuso; reutilização revoga a família.
- Logout revoga o refresh atual.
- `JwtAuthGuard` carrega a conta e valida:
  - existência da conta;
  - `account.tenantId === tid`;
  - status `ACTIVE` (bloqueada → `403 ACCOUNT_BLOCKED`).
- Toda request protegida faz uma consulta de conta (custo aceitável).
- `IdentityModule` exporta `JwtAuthGuard`, `TOKEN_ISSUER` e `ACCOUNT_REPOSITORY`
  para outros módulos que usam o guard.

### Rotas de auth

```text
POST /v1/auth/register
POST /v1/auth/login
POST /v1/auth/refresh
POST /v1/auth/logout
GET  /v1/auth/me

POST /v1/auth/password-reset/request
POST /v1/auth/password-reset/validate
POST /v1/auth/password-reset/confirm
```

- Registro cria tenant + primeira conta em transação.
- Login: `{ tenantDomain, email, password }`; conta bloqueada retorna
  `INVALID_CREDENTIALS`.
- Reset: token de 30 min, uso único, apenas SHA-256 no banco; solicitar invalida
  tokens anteriores; confirmar revoga todos os refresh tokens da conta.
- `request` sempre retorna `204` (anti-enumeração); rate limit 3/15 min por IP.
- `validate` não consome o token; retorna conta/tenant/`expiresAt`.
- Mailer: `MAIL_TRANSPORT=console` (padrão) ou `smtp` (Nodemailer/Mailpit).

## Contas (accounts)

Rotas:

```text
POST   /v1/accounts
GET    /v1/accounts?limit&offset&name&email
PATCH  /v1/accounts/:id
PATCH  /v1/accounts/:id/status
```

- `POST`: `{ name, email, password }`; e-mail único por tenant; conta `ACTIVE`.
- `GET`: paginação (`limit` 1–100 padrão 20, `offset` padrão 0) e filtros
  parciais case-insensitive por `name`/`email`; retorna `{ data, meta }`.
- `PATCH`: `name`, `email`, `password` todos opcionais (PATCH real), ao menos um;
  body `.strict()`; e-mail único por tenant; trocar senha revoga refresh tokens.
- `PATCH /status`: `{ status: "ACTIVE" | "BLOCKED" }`; bloquear revoga refresh
  tokens, invalida access tokens no próximo request e impede login; não permite
  auto-bloqueio (`409 CANNOT_BLOCK_SELF`).
- A resposta `accountSchema` inclui `status`.

## Clientes (customers)

Rotas:

```text
POST   /v1/customers
GET    /v1/customers?limit&offset&name&document
PATCH  /v1/customers/:id
DELETE /v1/customers/:id
```

- `name` é o único campo obrigatório.
- `address`, `document`, `documentType`, `phoneNumber` opcionais.
- `document` e `documentType` devem ser enviados juntos.
- `documentType`: `CPF` ou `CNPJ`.
- CPF: 11 dígitos + dígitos verificadores.
- CNPJ: numérico ou **alfanumérico** (12 caracteres `[A-Z0-9]` + 2 dígitos),
  com dígitos verificadores.
- Documento normalizado (uppercase/dígitos), sem pontuação, na resposta, junto
  de `documentType`.
- `phoneNumber` normalizado para 10–11 dígitos.
- Documento único por tenant entre clientes não excluídos, via índice único
  parcial `(tenant_id, document) where document is not null and deleted_at is null`.
- **Soft delete** (`deleted_at`); cliente excluído some da listagem e retorna
  `404` em edição/exclusão; o documento pode ser reutilizado.
- Listagem com paginação e filtros `name`/`document`; resposta `{ data, meta }`.
- PATCH aceita `null` em `address`, `document`, `documentType`, `phoneNumber`
  para limpar; `document`/`documentType` devem ser enviados juntos.
- Migration `006` inclui check constraint de consistência
  documento/tipo/tamanho.

## Produtos (products)

Rotas:

```text
POST   /v1/products
GET    /v1/products?limit&offset&name
GET    /v1/products/:id
PATCH  /v1/products/:id
DELETE /v1/products/:id
```

- `name`, `description` e `priceCents` são obrigatórios.
- `name` até 160 caracteres; `description` até 2000 caracteres.
- Requests e respostas usam `priceCents` inteiro `>= 0` (ex.: `4990`).
- O banco persiste `price_cents` como `bigInteger`, para precisão.
- A resposta inclui `createdAt` e `updatedAt` em ISO 8601.
- **Soft delete** (`deleted_at`); produto excluído some da listagem e retorna
  `404` em busca/edição/exclusão.
- Listagem com paginação e filtro parcial case-insensitive por `name`; resposta
  `{ data, meta }`.
- Não há unicidade de nome nesta etapa.
- Migration `007` inclui check constraint `price_cents >= 0`.
- IDs públicos usam o prefixo `prd_`.

## Serviços (services)

Rotas:

```text
POST   /v1/services
GET    /v1/services?limit&offset&name
GET    /v1/services/:id
PATCH  /v1/services/:id
DELETE /v1/services/:id
```

- `name`, `description` e `priceCents` são obrigatórios.
- `name` até 160 caracteres; `description` até 2000 caracteres.
- Requests e respostas usam `priceCents` inteiro `>= 0` (ex.: `12000`).
- O banco persiste `price_cents` como `bigInteger`, para precisão.
- A resposta inclui `createdAt` e `updatedAt` em ISO 8601.
- **Soft delete** (`deleted_at`); serviço excluído some da listagem e retorna
  `404` em busca/edição/exclusão.
- Listagem com paginação e filtro parcial case-insensitive por `name`; resposta
  `{ data, meta }`.
- Não há unicidade de nome nesta etapa.
- Migration `008` inclui check constraint `price_cents >= 0`.
- IDs públicos usam o prefixo `srv_`.

## Ordens de serviço (service-orders)

Rotas:

```text
POST   /v1/service-orders
GET    /v1/service-orders?limit&offset&protocol&customerId&productId&serviceId
GET    /v1/service-orders/:id
PATCH  /v1/service-orders/:id
DELETE /v1/service-orders/:id
```

- `customerId` obrigatório na criação e opcional no PATCH.
- `note` opcional, até 2000 caracteres; `null` limpa a observação.
- `products` e `services` são opcionais individualmente, mas a ordem precisa ter
  pelo menos um item no total.
- Produto: `productId`, `unitPriceCents` inteiro `>= 0` e `quantity` 1–9999.
- Serviço: `serviceId` e `priceCents` inteiro `>= 0`.
- Preços são obrigatórios e representam o valor praticado na ordem; não alteram
  o catálogo.
- O nome do produto/serviço é congelado no item (`product_name`/`service_name`)
  quando o item entra na ordem. Renomear ou excluir o catálogo não altera ordens
  antigas.
- `PATCH` com `products`/`services` substitui a lista enviada; o outro array é
  mantido quando omitido.
- Itens duplicados, quantidade inválida, preço inválido e ordem vazia são
  rejeitados.
- Cliente, produto e serviço precisam existir no tenant e não podem estar
  excluídos no momento da criação/edição.
- Criação/edição carregam produtos e serviços em lote (`WHERE IN`), não item a
  item.
- Protocolo numérico sequencial por tenant, começando em `100001`, gerado dentro
  da transação com `service_order_counters`; não é editável.
- Protocolo único por tenant (`unique (tenant_id, protocol)`), não reutilizado
  após soft delete.
- **Soft delete** (`deleted_at`) na ordem; os itens permanecem.
- Listagem com paginação, `protocol` parcial, `customerId`, `productId` e
  `serviceId`; resposta `{ data, meta }`.
- A resposta inclui cliente, ordem, produtos, serviços e `totalCents`.
- Migration `009` cria `service_orders`, `service_order_products`,
  `service_order_services` e `service_order_counters`.
- IDs públicos usam o prefixo `ord_`.

## Banco de dados

- Knex + SQLite (dev/testes) e PostgreSQL (prod).
- Migrations em `apps/api/src/database/migrations` (001–009):
  001 tenants, 002 accounts, 003 refresh_tokens, 004 password_reset_tokens,
  005 account status, 006 customers, 007 products, 008 services,
  009 service orders.
- UUIDv7 gerado na aplicação (`uuid`), timestamps na aplicação (`Clock`).
- Dinheiro deve ser armazenado em **centavos (integer/bigInteger)**.
- SQLite: pool min/max 1 e `PRAGMA foreign_keys = ON` via `pool.afterCreate`.
- Evitar SQL específico de dialeto; índices parciais e `CHECK` funcionam nos dois.
- **Não usar enum nativo do PostgreSQL**: o projeto precisa de paridade com
  SQLite. Preferir `varchar`/`text` + `CHECK` ou validação na aplicação.
- Migrations de produção usam `dist` e extensão `.js`; dev/testes usam `src` e
  `.ts`.
- Testes executam migrations diretamente via `test/helpers/migrate.ts` para não
  depender do loader de TS do Knex no Vitest.

## Contracts e validação

- `packages/contracts` é **ESM**.
- Schemas Zod por contexto em `packages/contracts/src/<contexto>`.
- Tipos derivados com `z.infer`; não duplicar DTOs.
- API usa `ZodValidationPipe` próprio (nestjs-zod não é compatível com Nest 12).
- Swagger usa `toOpenApiSchema` (Zod → OpenAPI 3.0) para request/response.
- Envelope de erro:

```json
{
  "error": {
    "code": "INVALID_DOCUMENT",
    "message": "Documento inválido",
    "details": [],
    "path": "/v1/customers",
    "timestamp": "2026-10-22T00:00:00.000Z"
  }
}
```

- Erros de domínio/aplicação estendem `AppError` com `code`; o filtro global
  mapeia código → HTTP. Erros de validação Zod → `VALIDATION_ERROR` 400.

## Convenções de código

- Código e nomes de domínio em **inglês**; textos de UI/erros em **pt-BR**.
- API é **ESM**: `"type": "module"`, `module/moduleResolution: NodeNext`,
  imports relativos com `.js`.
- Usar `@Inject(TOKEN)` explícito em dependências de interfaces/classes em que o
  lint ou o ESM exijam (evita depender de metadata em runtime).
- Value objects/entidades validam invariantes; use cases orquestram; controllers
  não contêm regra de negócio.
- Datas em UTC; dinheiro em centavos.
- Não retornar `password_hash`, tokens ou dados sensíveis.
- Não logar tokens/senhas; o `ConsoleMailer` só loga link em dev.
- Não confiar em `tenantId` vindo do cliente.
- Body de PATCH/update usa `.strict()` e exige ao menos um campo.
- Filtros parciais usam `LOWER(...) LIKE ? ESCAPE '\'` + `escapeLike`.
- Paginação sempre `{ data, meta: { limit, offset, total } }`.

## Testes

- Vitest, ambiente `node` na API; `jsdom` + Testing Library no web.
- API usa SQLite `:memory:` por arquivo de teste e migrations reais.
- Com `DATABASE_CLIENT=pg`, os e2e usam PostgreSQL com um schema isolado por
  worker (`test_<pid>`); `test/helpers/migrate.ts` cria e recria esse schema.
- `test/helpers/migrate.ts` deve ser atualizado ao adicionar migration.
- E2E usam Supertest, `configureApp` e agents quando precisam de cookie.
- `test/setup.ts` define env de teste (JWT_SECRET, TTLs, rate limit alto,
  `MAIL_TRANSPORT=console`, `COOKIE_DOMAIN=''`, `DATABASE_CLIENT` padrão e
  `TEST_DB_SCHEMA`).
- CI: `quality` roda lint, typecheck, unitários da API e build; `web-tests`
  roda os testes do web; `api-e2e` roda a matriz SQLite/PostgreSQL.
- `test:e2e` não usa cache do Turbo (`cache: false`) porque depende do banco
  externo.
- Mailer nos testes: `FakeMailer` via `overrideProvider(MAILER)`.
- Documentos de teste: gerar CPF/CNPJ válidos no próprio teste; não usar dados
  reais.
- Estado atual: 150 testes na API + 55 no web. Sempre manter lint, typecheck,
  test e build verdes.

## Frontend

- Next.js App Router; login em `/login`, registro de tenant em `/register`,
  recuperação de senha em `/forgot-password` e `/reset-password`, gestão de
  usuários em `/accounts`, e home protegida em `/`.
- Tailwind v4 + shadcn/ui configurado; primitivos locais em `shared/ui`
  (`button`, `input`, `label`, `alert`, `dialog`).
- `apps/web/src/modules` espelha os contextos da API; auth fica em
  `modules/identity` (`lib/auth-api.ts`, `lib/accounts-api.ts`,
  `providers/auth-provider.tsx`, `components/app-shell.tsx`,
  `components/login-form.tsx`, `components/register-form.tsx`,
  `components/forgot-password-form.tsx`, `components/reset-password-flow.tsx`,
  `components/accounts-screen.tsx`, `components/accounts-table.tsx`,
  `components/accounts-filters.tsx`, `components/account-form-dialog.tsx`,
  `components/account-password-dialog.tsx`, `components/confirm-dialog.tsx`).
- `AuthProvider` no `layout.tsx` mantém a sessão: access token apenas em
  memória, restauração via `/v1/auth/refresh` no carregamento, renovação
  proativa antes de expirar (com jitter e apenas com aba visível) e retry
  automático no `401`.
- Client HTTP em `shared/lib/api-client.ts`: `ApiError` com o envelope da API,
  tratamento de `204`, `credentials: include`, Bearer e refresh single-flight.
- O web usa `@servico-certo/contracts` para validar o formulário e as respostas
  de auth (`loginSchema`, `authResponseSchema`).
- Proteção de rota é client-side, pois o token não é persistido em storage.
- Recuperação de senha: `/forgot-password` envia a solicitação e sempre mostra
  mensagem genérica (anti-enumeração); `/reset-password?token=...` valida o token
  ao carregar e envia a nova senha, tratando link expirado/uso único. O fluxo
  não autentica automaticamente.
- Gestão de usuários: `/accounts` lista as contas do tenant com paginação e
  filtros por nome/e-mail, criação, edição, troca de senha, envio de reset de
  senha por e-mail e bloqueio/desbloqueio. A própria conta não pode ser
  bloqueada; contas bloqueadas não recebem reset (o botão fica desabilitado).
  Editar o próprio nome ou e-mail sincroniza o cabeçalho via `updateAccount` do
  `AuthProvider`. Trocar a própria senha derruba os refresh tokens, mas mantém o
  access token atual até expirar.
- Ainda faltam: clientes, produtos, serviços e ordens de serviço.
- Tokens: access em memória; refresh em cookie httpOnly; `/refresh` no reload.
- `NEXT_PUBLIC_API_URL` configurada em `apps/web/.env.local`.

## Decisões importantes já tomadas

- Next = frontend; Nest = API.
- Knex + SQLite dev + PostgreSQL prod.
- Multi-tenant desde o início; e-mail único por tenant.
- `domain` do tenant é slug único.
- Sem roles por enquanto; todas as contas do tenant têm os mesmos poderes.
- Access token JWT curto; refresh opaco com rotação/reuso.
- IDs públicos prefixados derivados de UUIDv7 (16 bytes, 22 chars base64url).
- Reset de senha sempre responde `204` na solicitação (anti-enumeração).
- Conta bloqueada é rejeitada imediatamente no guard.
- Clientes: soft delete, somente `name` obrigatório, `documentType` explícito.
- Produtos: API 100% em centavos (`priceCents` inteiro em requests e respostas)
  e banco em centavos; soft delete; `name`, `description` e `priceCents`
  obrigatórios.
- Serviços: mesmo contrato de produtos, com API 100% em centavos (`priceCents`
  inteiro), soft delete e IDs `srv_`; `name`, `description` e `priceCents`
  obrigatórios.
- Ordens de serviço: protocolo numérico sequencial por tenant, itens com preços
  praticados independentes do catálogo, snapshots de nome de produto/serviço,
  soft delete e IDs `ord_`.
- Sem enum nativo Postgres; paridade SQLite/Postgres.
- Rate limit atual: 3/15 min por IP na solicitação de reset.

## Próximos passos naturais

1. Telas de auth (login, registro, reset), clientes, produtos, serviços e ordens
   de serviço no frontend.
2. Papéis/permissões (OWNER/STAFF) e convite de contas.
3. Estoque e movimentações.
4. Faturamento/nota (port + adapter, provedor depois).
5. Hardening: rate limit global, observabilidade, revogação imediata de access
   token via `tokenVersion`, auditoria.

## Checklist antes de finalizar uma mudança

```bash
pnpm format
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

- Atualizar contracts e Swagger quando a API mudar.
- Atualizar README e este `AGENTS.md` quando uma decisão estrutural mudar.
- Criar migration e atualizar `test/helpers/migrate.ts` juntos.
- Validar migrations no SQLite e, quando possível, no PostgreSQL.
- Não commitar `.env`, `.data`, `dist`, `.next` ou tokens.
