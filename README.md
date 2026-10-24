# Serviço Certo

> Sistema de Ordens de Serviço open source para pequenos negócios.

O **Serviço Certo** é um projeto pessoal em desenvolvimento com o objetivo de ajudar pequenos
negócios a organizarem sua operação em um só lugar: registrar os serviços prestados, emitir nota e
fazer a gestão do estoque.

## Objetivos

- **Ordens de Serviço** — registre os serviços prestados de forma simples e organizada.
- **Emissão de nota** — agilize a documentação dos serviços realizados.
- **Gestão de estoque** — acompanhe entradas, saídas e disponibilidade de itens.

## Stack

| Camada    | Tecnologias                                             |
| --------- | ------------------------------------------------------- |
| Frontend  | Next.js (App Router), React, Tailwind CSS v4, shadcn/ui |
| Backend   | NestJS, TypeScript                                      |
| Banco     | Knex + SQLite (dev/testes) + PostgreSQL (produção)      |
| Monorepo  | pnpm workspaces + Turborepo                             |
| Qualidade | ESLint, Prettier, Vitest, TypeScript                    |

## Estrutura do repositório

```
servico-certo/
├─ apps/
│  ├─ api/                  # NestJS — API REST
│  │  ├─ src/
│  │  │  ├─ database/       # conexão Knex, migrations e seeds
│  │  │  ├─ health/         # health check
│  │  │  ├─ modules/        # contextos de negócio (identity, customers, products, services e service-orders)
│  │  │  └─ shared/         # env, filtros e código transversal
│  │  ├─ test/              # testes e2e
│  │  └─ knexfile.ts
│  └─ web/                  # Next.js — interface
│     └─ src/
│        ├─ app/            # App Router
│        ├─ modules/        # features (espelham os contextos da API)
│        └─ shared/         # ui, lib e hooks
├─ packages/
│  ├─ config/               # presets de TS, ESLint, Prettier e tema Tailwind
│  └─ contracts/            # contratos compartilhados entre API e web
├─ infra/
│  └─ docker-compose.yml    # PostgreSQL para desenvolvimento
├─ turbo.json
├─ pnpm-workspace.yaml
└─ tsconfig.base.json
```

## Como rodar

**Pré-requisitos:** Node.js 22+, pnpm 10+ e Docker (opcional, apenas para PostgreSQL).

```bash
# 1. Instale as dependências
pnpm install

# 2. Crie o arquivo de ambiente da API
cp .env.example .env

# 3. Crie as tabelas do banco (SQLite por padrão)
pnpm db:migrate

# 4. (Opcional) Sobrescreva a URL da API usada pelo web
cp apps/web/.env.example apps/web/.env.local

# 5. Suba API e web em modo desenvolvimento
pnpm dev
```

| Serviço      | URL                          |
| ------------ | ---------------------------- |
| Web          | http://localhost:3000        |
| API          | http://localhost:3001        |
| Health check | http://localhost:3001/health |
| Swagger      | http://localhost:3001/docs   |

O banco padrão em desenvolvimento é o SQLite, criado em `apps/api/.data/dev.sqlite` após rodar as
migrations. O `.env.example` já inclui um `JWT_SECRET` de desenvolvimento; troque esse valor em
produção.

## Banco de dados

Para usar PostgreSQL em desenvolvimento:

```bash
docker compose -f infra/docker-compose.yml up -d
```

Depois, ajuste o `.env`:

```dotenv
DATABASE_CLIENT=pg
DATABASE_URL=postgres://servico_certo:servico_certo@localhost:5432/servico_certo
```

E rode as migrations:

```bash
pnpm db:migrate
```

As migrations `001` a `010` criam as tabelas do identity, de clientes, de
produtos, de serviços e de ordens de serviço (`tenants`, `accounts`,
`refresh_tokens`, `password_reset_tokens`, `customers`, `products`, `services`,
`service_orders`, `service_order_products`, `service_order_services` e
`service_order_counters`), além do status de accounts e do snapshot do criador
das ordens de serviço, e já rodam tanto no SQLite quanto no PostgreSQL.

O `docker compose` também sobe o **Mailpit**:

- SMTP: `localhost:1025`
- Interface web: http://localhost:8025

## Identity e autenticação

O contexto `identity` implementa tenants, contas e sessões.

| Método | Rota                               | Descrição                                     |
| ------ | ---------------------------------- | --------------------------------------------- |
| `POST` | `/v1/auth/register`                | Cria um tenant e a primeira conta             |
| `POST` | `/v1/auth/login`                   | Autentica com slug do tenant, e-mail e senha  |
| `POST` | `/v1/auth/refresh`                 | Rotaciona a sessão usando o cookie de refresh |
| `POST` | `/v1/auth/logout`                  | Revoga a sessão atual                         |
| `GET`  | `/v1/auth/me`                      | Retorna a conta e o tenant do token de acesso |
| `POST` | `/v1/auth/password-reset/request`  | Solicita o envio do link de reset             |
| `POST` | `/v1/auth/password-reset/validate` | Valida o token e retorna conta/tenant         |
| `POST` | `/v1/auth/password-reset/confirm`  | Define a nova senha                           |

- Senhas com **argon2id**.
- **Access token** JWT de 15 minutos, retornado no JSON.
- **Refresh token** opaco em cookie `httpOnly`, com rotação e detecção de reuso.
- E-mail único **por tenant**; o login resolve o tenant pelo slug (`domain`).
- IDs públicos no formato `{prefixo}_{base64url(16 bytes do UUIDv7)}`:
  - tenant: `ten_AaFXJKFudkiOtV8yn8ts-g`
  - account: `acc_...`
- No banco, os IDs continuam **UUIDv7 puros**; o prefixo existe apenas na borda HTTP.

### Reset de senha

Fluxo em três etapas:

1. `POST /v1/auth/password-reset/request` com `{ tenantDomain, email }`.
   A resposta é sempre `204`, exista ou não a conta.
2. O e-mail contém um link `{WEB_APP_URL}/reset-password?token=...`.
3. `POST /v1/auth/password-reset/validate` com `{ token }` retorna a conta e o
   tenant que serão redefinidos, sem consumir o token.
4. `POST /v1/auth/password-reset/confirm` com `{ token, password }` consome o
   token e define a nova senha.

- Token de uso único, válido por **30 minutos**, salvo apenas como SHA-256.
- Solicitar um novo link invalida os tokens pendentes anteriores.
- A confirmação revoga todos os refresh tokens da conta.
- A solicitação tem rate limit de **3 tentativas por 15 minutos por IP**.
- No frontend, `/forgot-password` solicita o link e `/reset-password?token=...`
  valida o token, permite definir a nova senha e trata link expirado ou já
  utilizado.

**Envio de e-mail:** por padrão `MAIL_TRANSPORT=console`, que imprime o link no
log da API. Para usar SMTP, configure `MAIL_TRANSPORT=smtp` e as variáveis
`SMTP_*`. O `docker compose` sobe o Mailpit em `http://localhost:8025` para
inspecionar os e-mails em desenvolvimento.

### Contas

| Método  | Rota                      | Descrição                                     |
| ------- | ------------------------- | --------------------------------------------- |
| `POST`  | `/v1/accounts`            | Cria uma conta no tenant autenticado          |
| `GET`   | `/v1/accounts`            | Lista as contas do tenant autenticado         |
| `PATCH` | `/v1/accounts/:id`        | Atualiza nome, e-mail e/ou senha de uma conta |
| `PATCH` | `/v1/accounts/:id/status` | Bloqueia ou desbloqueia uma conta             |

As quatro rotas exigem `Authorization: Bearer <accessToken>`.

**Criar conta**

```http
POST /v1/accounts
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "name": "Maria Silva",
  "email": "maria@exemplo.com",
  "password": "senha-super-segura"
}
```

Resposta `201`:

```json
{
  "id": "acc_AaFXJKFudkiOtV8yn8ts-g",
  "name": "Maria Silva",
  "email": "maria@exemplo.com",
  "status": "ACTIVE"
}
```

- O e-mail é normalizado para lowercase e é único **por tenant**; duplicidade
  retorna `409 EMAIL_TAKEN`.
- A senha segue a política mínima de 10 caracteres e é salva com argon2id.
- A conta é criada no tenant do token; não é possível escolher outro tenant no
  body.
- Não há verificação de e-mail nem papéis nesta etapa; a conta já pode fazer
  login com a senha informada.

**Editar conta**

```http
PATCH /v1/accounts/acc_AaFXJKFudkiOtV8yn8ts-g
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "name": "Maria Souza",
  "email": "maria.souza@exemplo.com",
  "password": "nova-senha-super-segura"
}
```

- Todos os campos são opcionais, mas pelo menos um deve ser enviado.
- Campos omitidos permanecem inalterados (semântica de PATCH).
- `name` e `email` são normalizados e validados.
- `email` continua único por tenant; duplicidade retorna `409 EMAIL_TAKEN`.
- Alterar a senha revoga todos os refresh tokens da conta.
- Campos desconhecidos, como `passwordHash`, são rejeitados com `400`.
- A conta precisa pertencer ao tenant do token; caso contrário, retorna `404
ACCOUNT_NOT_FOUND`.
- O `:id` é o ID público (`acc_...`).

Resposta `200` com a conta atualizada.

**Bloquear/desbloquear conta**

```http
PATCH /v1/accounts/acc_AaFXJKFudkiOtV8yn8ts-g/status
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "status": "BLOCKED"
}
```

Use `"status": "ACTIVE"` para desbloquear. A operação é idempotente.

- Bloquear revoga todos os refresh tokens da conta.
- Access tokens existentes passam a ser recusados imediatamente pelo guard com
  `403 ACCOUNT_BLOCKED`.
- O login de uma conta bloqueada retorna `401 INVALID_CREDENTIALS`.
- Desbloquear permite o login novamente.
- Não é possível bloquear a própria conta (`409 CANNOT_BLOCK_SELF`).
- A conta precisa pertencer ao tenant do token (`404 ACCOUNT_NOT_FOUND`).
- A resposta `200` inclui o campo `status` atualizado.

**Listar contas**

`GET /v1/accounts` lista as contas do tenant autenticado.

| Parâmetro | Tipo   | Descrição                                     |
| --------- | ------ | --------------------------------------------- |
| `limit`   | number | Itens por página, entre 1 e 100. Padrão `20`. |
| `offset`  | number | Itens a pular, a partir de 0. Padrão `0`.     |
| `name`    | string | Busca parcial e case-insensitive por nome.    |
| `email`   | string | Busca parcial e case-insensitive por e-mail.  |

Os filtros podem ser combinados com AND. A resposta é paginada:

```json
{
  "data": [
    {
      "id": "acc_AaFXJKFudkiOtV8yn8ts-g",
      "name": "João",
      "email": "joao@exemplo.com",
      "status": "ACTIVE"
    }
  ],
  "meta": {
    "limit": 20,
    "offset": 0,
    "total": 1
  }
}
```

O `tenantId` nunca vem da query string: ele é extraído do access token, então
uma conta só enxerga as demais contas do próprio tenant.

## Clientes

CRUD de clientes, multi-tenant, com validação de CPF e CNPJ.

| Método   | Rota                | Descrição                                        |
| -------- | ------------------- | ------------------------------------------------ |
| `POST`   | `/v1/customers`     | Cria um cliente                                  |
| `GET`    | `/v1/customers`     | Lista com `limit`, `offset`, `name` e `document` |
| `PATCH`  | `/v1/customers/:id` | Edita os dados do cliente                        |
| `DELETE` | `/v1/customers/:id` | Exclui logicamente o cliente                     |

Todas exigem `Authorization: Bearer <accessToken>`.

**Campos**

- `name` é o único campo obrigatório.
- `address`, `document`, `documentType` e `phoneNumber` são opcionais.
- `document` e `documentType` devem ser enviados juntos.
- `documentType`: `CPF` ou `CNPJ`.
- CPF: 11 dígitos com validação dos dígitos verificadores.
- CNPJ: numérico ou alfanumérico, com validação dos dígitos verificadores.
- A API aceita documento formatado e devolve normalizado (`document` em
  dígitos/uppercase + `documentType`).
- `phoneNumber` é normalizado para dígitos (10 ou 11).
- O documento é único por tenant entre clientes não excluídos.
- A exclusão é **soft delete**; o documento pode ser reutilizado depois.

**Criar cliente**

```http
POST /v1/customers
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "name": "Maria Silva",
  "address": "Rua das Flores, 123",
  "document": "529.982.247-25",
  "documentType": "CPF",
  "phoneNumber": "(11) 99999-8888"
}
```

Resposta `201`:

```json
{
  "id": "cus_AaFXJKFudkiOtV8yn8ts-g",
  "name": "Maria Silva",
  "address": "Rua das Flores, 123",
  "document": "52998224725",
  "documentType": "CPF",
  "phoneNumber": "11999998888"
}
```

**Editar cliente**

PATCH com os campos opcionais. Enviar `null` em `address`, `document`,
`documentType` ou `phoneNumber` limpa o campo. Para alterar o documento, envie
`document` e `documentType` juntos.

**Listar clientes**

Aceita `limit` (1–100, padrão 20), `offset` (padrão 0), `name` (busca parcial
case-insensitive) e `document` (busca parcial normalizada). A resposta segue o
envelope `{ data, meta }`.

**Excluir cliente**

`DELETE /v1/customers/:id` retorna `204`. O cliente deixa de aparecer na
listagem, mas o registro é preservado para futuras ordens de serviço.

## Produtos

CRUD de produtos, multi-tenant, com preço em centavos e soft delete.

| Método   | Rota               | Descrição                            |
| -------- | ------------------ | ------------------------------------ |
| `POST`   | `/v1/products`     | Cria um produto                      |
| `GET`    | `/v1/products`     | Lista com `limit`, `offset` e `name` |
| `GET`    | `/v1/products/:id` | Busca um produto por ID              |
| `PATCH`  | `/v1/products/:id` | Edita os dados do produto            |
| `DELETE` | `/v1/products/:id` | Exclui logicamente o produto         |

Todas exigem `Authorization: Bearer <accessToken>`. Os IDs públicos usam o
prefixo `prd_`.

**Campos**

- `name` obrigatório (até 160 caracteres).
- `description` opcional (até 2000 caracteres).
- `priceCents` obrigatório na criação/edição, inteiro maior ou igual a zero.
- `createdAt` e `updatedAt` são retornados em ISO 8601.
- Requests e respostas usam **centavos** no campo `priceCents`.
- O banco persiste `price_cents` como inteiro para evitar erros de ponto
  flutuante.
- A exclusão é **soft delete** (`deleted_at`); o registro permanece no banco e
  some das consultas.
- A listagem aceita `limit` (1–100, padrão 20), `offset` (padrão 0) e `name`
  (busca parcial case-insensitive), no envelope `{ data, meta }`.

**Criar produto**

```http
POST /v1/products
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "name": "Tinta de Cabelo",
  "description": "Tinta profissional castanho 60 ml",
  "priceCents": 4590
}
```

Resposta `201`:

```json
{
  "id": "prd_AaFXJKFudkiOtV8yn8ts-g",
  "name": "Tinta de Cabelo",
  "description": "Tinta profissional castanho 60 ml",
  "priceCents": 4590,
  "createdAt": "2026-10-22T12:00:00.000Z",
  "updatedAt": "2026-10-22T12:00:00.000Z"
}
```

**Editar produto**

PATCH com `name`, `description` e/ou `priceCents`. Ao menos um campo deve ser
enviado. O preço segue a mesma validação da criação e continua em centavos.

**Excluir produto**

`DELETE /v1/products/:id` retorna `204`. O produto deixa de aparecer na
listagem e nas buscas por ID, mas o registro permanece com `deleted_at`
preenchido.

## Serviços

CRUD de serviços, multi-tenant, com preço em centavos e soft delete.

| Método   | Rota               | Descrição                            |
| -------- | ------------------ | ------------------------------------ |
| `POST`   | `/v1/services`     | Cria um serviço                      |
| `GET`    | `/v1/services`     | Lista com `limit`, `offset` e `name` |
| `GET`    | `/v1/services/:id` | Busca um serviço por ID              |
| `PATCH`  | `/v1/services/:id` | Edita os dados do serviço            |
| `DELETE` | `/v1/services/:id` | Exclui logicamente o serviço         |

Todas exigem `Authorization: Bearer <accessToken>`. Os IDs públicos usam o
prefixo `srv_`.

**Campos**

- `name` obrigatório (até 160 caracteres).
- `description` opcional (até 2000 caracteres).
- `priceCents` obrigatório na criação/edição, inteiro maior ou igual a zero.
- `createdAt` e `updatedAt` são retornados em ISO 8601.
- Requests e respostas usam **centavos** no campo `priceCents`.
- O banco persiste `price_cents` como inteiro para evitar erros de ponto
  flutuante.
- A exclusão é **soft delete** (`deleted_at`); o registro permanece no banco e
  some das consultas.
- A listagem aceita `limit` (1–100, padrão 20), `offset` (padrão 0) e `name`
  (busca parcial case-insensitive), no envelope `{ data, meta }`.

**Criar serviço**

```http
POST /v1/services
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "name": "Troca de Óleo",
  "description": "Troca de óleo e filtro para carro de passeio",
  "priceCents": 12000
}
```

Resposta `201`:

```json
{
  "id": "srv_AaFXJKFudkiOtV8yn8ts-g",
  "name": "Troca de Óleo",
  "description": "Troca de óleo e filtro para carro de passeio",
  "priceCents": 12000,
  "createdAt": "2026-10-22T12:00:00.000Z",
  "updatedAt": "2026-10-22T12:00:00.000Z"
}
```

**Editar serviço**

PATCH com `name`, `description` e/ou `priceCents`. Ao menos um campo deve ser
enviado. O preço segue a mesma validação da criação e continua em centavos.

**Excluir serviço**

`DELETE /v1/services/:id` retorna `204`. O serviço deixa de aparecer na
listagem e nas buscas por ID, mas o registro permanece com `deleted_at`
preenchido.

## Ordens de serviço

CRUD de ordens de serviço, multi-tenant, com protocolo numérico sequencial,
preços personalizados por item, snapshots de nome e soft delete.

| Método   | Rota                             | Descrição                                        |
| -------- | -------------------------------- | ------------------------------------------------ |
| `POST`   | `/v1/service-orders`             | Cria uma ordem de serviço                        |
| `GET`    | `/v1/service-orders`             | Lista com paginação e filtros                    |
| `GET`    | `/v1/service-orders/:id`         | Busca uma ordem com cliente, produtos e serviços |
| `GET`    | `/v1/service-orders/:id/receipt` | Gera o comprovante da ordem em PDF               |
| `PATCH`  | `/v1/service-orders/:id`         | Atualiza a ordem                                 |
| `DELETE` | `/v1/service-orders/:id`         | Exclui logicamente a ordem                       |

Todas exigem `Authorization: Bearer <accessToken>`. Os IDs públicos usam o
prefixo `ord_`.

**Campos e regras**

- `customerId` obrigatório na criação e opcional na edição.
- `note` opcional, com até 2000 caracteres; `null` limpa a observação.
- `products` e `services` são opcionais individualmente, mas a ordem precisa
  ter pelo menos um item no total.
- Cada produto envia `productId`, `unitPriceCents` e `quantity` (1–9999).
- Cada serviço envia `serviceId` e `priceCents`.
- Os preços são obrigatórios no request. A UI pode pré-preencher com o valor do
  catálogo, mas o vendedor pode alterar o valor praticado na ordem.
- Alterar o preço na ordem **não altera** o preço do produto ou serviço no
  catálogo.
- O nome do produto/serviço é congelado quando o item entra na ordem. Renomear
  ou excluir o item do catálogo não altera ordens antigas.
- Produtos e serviços duplicados na mesma lista são rejeitados.
- Cliente, produto e serviço precisam existir no tenant e não podem estar
  excluídos no momento da criação/edição.
- A ordem recebe um protocolo numérico sequencial por tenant, iniciando em
  `100001`; o protocolo não pode ser alterado.
- A listagem aceita `limit`, `offset`, `protocol` (busca parcial),
  `customerId`, `productId` e `serviceId`, no envelope `{ data, meta }`.
- `PATCH` com `products` ou `services` substitui a lista inteira enviada; se
  apenas um dos arrays for enviado, o outro é mantido.
- A exclusão é **soft delete** (`deleted_at`); a ordem some das consultas, mas
  os itens permanecem no banco.
- O criador da ordem é registrado no momento da criação (nome e e-mail são
  congelados na ordem). Ordens antigas podem ter `createdBy: null`.
- `GET /v1/service-orders/:id/receipt` retorna `application/pdf` com o
  comprovante da ordem: dados do tenant, número do protocolo, cliente, itens,
  total, observação, criador da ordem, datas de criação e atualização, além de
  quem gerou o PDF e o horário da geração.

**Criar ordem de serviço**

```http
POST /v1/service-orders
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "customerId": "cus_AaFXJKFudkiOtV8yn8ts-g",
  "note": "Troca de óleo e revisão",
  "products": [
    {
      "productId": "prd_AaFXJKFudkiOtV8yn8ts-g",
      "unitPriceCents": 3500,
      "quantity": 2
    }
  ],
  "services": [
    {
      "serviceId": "srv_AaFXJKFudkiOtV8yn8ts-g",
      "priceCents": 12000
    }
  ]
}
```

Resposta `201`:

```json
{
  "id": "ord_AaFXJKFudkiOtV8yn8ts-g",
  "protocol": "100001",
  "note": "Troca de óleo e revisão",
  "customer": {
    "id": "cus_AaFXJKFudkiOtV8yn8ts-g",
    "name": "Maria",
    "address": null,
    "document": null,
    "documentType": null,
    "phoneNumber": null
  },
  "createdBy": {
    "id": "acc_AaFXJKFudkiOtV8yn8ts-g",
    "name": "João",
    "email": "joao@exemplo.com"
  },
  "products": [
    {
      "productId": "prd_AaFXJKFudkiOtV8yn8ts-g",
      "name": "Óleo 5W30",
      "unitPriceCents": 3500,
      "quantity": 2,
      "totalCents": 7000
    }
  ],
  "services": [
    {
      "serviceId": "srv_AaFXJKFudkiOtV8yn8ts-g",
      "name": "Troca de óleo",
      "priceCents": 12000
    }
  ],
  "totalCents": 19000,
  "createdAt": "2026-10-22T12:00:00.000Z",
  "updatedAt": "2026-10-22T12:00:00.000Z"
}
```

**Editar ordem de serviço**

PATCH com `customerId`, `note`, `products` e/ou `services`. Ao menos um campo
deve ser enviado. O protocolo não é editável.

**Excluir ordem de serviço**

`DELETE /v1/service-orders/:id` retorna `204`. A ordem some da listagem e das
buscas por ID, mas o registro e seus itens permanecem no banco com `deleted_at`
preenchido.

**Comprovante em PDF**

`GET /v1/service-orders/:id/receipt` retorna o PDF com `Content-Disposition:
attachment; filename="comprovante-ordem-100001.pdf"`. No frontend, a ação
**Abrir** exibe os principais dados da ordem em um popup com o botão
**Baixar comprovante PDF**.

## Scripts

| Comando            | Descrição                        |
| ------------------ | -------------------------------- |
| `pnpm dev`         | Sobe API e web em modo watch     |
| `pnpm build`       | Build de todos os pacotes e apps |
| `pnpm lint`        | ESLint em todo o monorepo        |
| `pnpm typecheck`   | Checagem de tipos                |
| `pnpm test`        | Todos os testes com Vitest       |
| `pnpm test:unit`   | Testes unitários da API          |
| `pnpm test:e2e`    | Testes e2e da API                |
| `pnpm format`      | Formata o código com Prettier    |
| `pnpm db:migrate`  | Aplica as migrations             |
| `pnpm db:rollback` | Reverte a última migration       |
| `pnpm db:seed`     | Executa os seeds                 |

Os testes e2e usam SQLite `:memory:` por padrão. Para executá-los contra o
PostgreSQL local:

```bash
docker compose -f infra/docker-compose.yml up -d postgres
DATABASE_CLIENT=pg \
DATABASE_URL=postgres://servico_certo:servico_certo@localhost:5432/servico_certo \
pnpm test:e2e
```

Cada worker usa um schema temporário (`test_<pid>`), então as migrations de
teste não alteram o schema `public`. No CI, o job `api-e2e` executa a matriz
SQLite/PostgreSQL.

Em produção, rode `pnpm build` e use as variantes `:prod` (`db:migrate:prod`,
`db:rollback:prod`, `db:seed:prod`), que executam o CLI compilado em `dist` com
`NODE_ENV=production`.

## Arquitetura

O backend segue os conceitos de **Clean Architecture** em um modular monolith. Cada contexto
(`identity`, `customers`, `products`, `services`, `service-orders`) é dividido em:

```
domain/           # entidades, value objects, erros e ports — TypeScript puro
application/      # use cases, queries e ports de integração
infrastructure/   # Knex, integrações externas e implementações das ports
presentation/     # controllers, DTOs e presenters HTTP
```

A regra de dependência aponta sempre para dentro: `presentation` e `infrastructure` dependem de
`application`, que depende de `domain`. O domínio não conhece NestJS, Knex ou qualquer detalhe
externo. A composição acontece no `<module>.module.ts`.

Os contextos `identity`, `customers`, `products`, `services` e `service-orders` têm as quatro
camadas implementadas. O padrão completo está em
[`apps/api/src/modules/README.md`](apps/api/src/modules/README.md).

## Status do projeto

O projeto está **no início**. O scaffold do monorepo, a API base, o contexto de identity (tenants,
accounts, autenticação, reset de senha, criação, listagem, edição e bloqueio de contas), o módulo de
clientes (CRUD com CPF/CNPJ), o módulo de produtos (CRUD com preço e soft delete), o módulo de
serviços (CRUD com preço em centavos e soft delete) e o módulo de ordens de serviço (protocolo
sequencial, itens com preços personalizados, snapshots de nome e soft delete) já estão
implementados. No frontend, login, registro de tenant, recuperação de senha, gestão de clientes,
gestão de produtos, gestão de serviços, gestão de ordens de serviço, gestão de usuários (contas) e a
sessão com renovação de token já funcionam. As demais funcionalidades de negócio ainda não foram
implementadas.

## IA no desenvolvimento: uma visão pragmática

Este projeto também é um espaço para discutir um ponto importante: precisamos ter uma **visão
pragmática sobre o uso de IA no desenvolvimento de software**.

A IA é uma ferramenta fantástica, mas é preciso **balancear velocidade, qualidade e segurança**. Ao
longo do desenvolvimento do Serviço Certo, vou abordar como esse equilíbrio é feito na prática.

## Ideias e sugestões

Tem uma ideia, dúvida ou sugestão? Compartilhe!

- Abra uma [issue](https://github.com/K4w4n/servico-certo/issues) com sua proposta.
- Ou me chame para conversar.

## Contexto para agentes

As instruções persistentes do projeto para agentes de IA estão em
[`AGENTS.md`](AGENTS.md): stack, arquitetura, decisões, convenções, comandos e
checklist de validação.

## Licença

A definir — o projeto é open source e a licença será publicada em breve.
