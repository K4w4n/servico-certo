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
│  │  │  ├─ modules/        # contextos de negócio (identity implementado)
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

As migrations `001_create_tenants`, `002_create_accounts` e `003_create_refresh_tokens` criam as
tabelas do contexto de identity e já rodam tanto no SQLite quanto no PostgreSQL.

## Identity e autenticação

O contexto `identity` implementa tenants, contas e sessões.

| Método | Rota                | Descrição                                     |
| ------ | ------------------- | --------------------------------------------- |
| `POST` | `/v1/auth/register` | Cria um tenant e a primeira conta             |
| `POST` | `/v1/auth/login`    | Autentica com slug do tenant, e-mail e senha  |
| `POST` | `/v1/auth/refresh`  | Rotaciona a sessão usando o cookie de refresh |
| `POST` | `/v1/auth/logout`   | Revoga a sessão atual                         |
| `GET`  | `/v1/auth/me`       | Retorna a conta e o tenant do token de acesso |

- Senhas com **argon2id**.
- **Access token** JWT de 15 minutos, retornado no JSON.
- **Refresh token** opaco em cookie `httpOnly`, com rotação e detecção de reuso.
- E-mail único **por tenant**; o login resolve o tenant pelo slug (`domain`).
- IDs públicos no formato `{prefixo}_{base64url(16 bytes do UUIDv7)}`:
  - tenant: `ten_AaFXJKFudkiOtV8yn8ts-g`
  - account: `acc_...`
- No banco, os IDs continuam **UUIDv7 puros**; o prefixo existe apenas na borda HTTP.

## Scripts

| Comando            | Descrição                        |
| ------------------ | -------------------------------- |
| `pnpm dev`         | Sobe API e web em modo watch     |
| `pnpm build`       | Build de todos os pacotes e apps |
| `pnpm lint`        | ESLint em todo o monorepo        |
| `pnpm typecheck`   | Checagem de tipos                |
| `pnpm test`        | Testes com Vitest                |
| `pnpm format`      | Formata o código com Prettier    |
| `pnpm db:migrate`  | Aplica as migrations             |
| `pnpm db:rollback` | Reverte a última migration       |
| `pnpm db:seed`     | Executa os seeds                 |

Em produção, rode `pnpm build` e use as variantes `:prod` (`db:migrate:prod`,
`db:rollback:prod`, `db:seed:prod`), que executam o CLI compilado em `dist` com
`NODE_ENV=production`.

## Arquitetura

O backend segue os conceitos de **Clean Architecture** em um modular monolith. Cada contexto
(`identity`, `customers`, `catalog`, `work-orders`, `inventory`, `invoicing`) é dividido em:

```
domain/           # entidades, value objects, erros e ports — TypeScript puro
application/      # use cases, queries e ports de integração
infrastructure/   # Knex, integrações externas e implementações das ports
presentation/     # controllers, DTOs e presenters HTTP
```

A regra de dependência aponta sempre para dentro: `presentation` e `infrastructure` dependem de
`application`, que depende de `domain`. O domínio não conhece NestJS, Knex ou qualquer detalhe
externo. A composição acontece no `<module>.module.ts`.

O contexto `identity` já tem as quatro camadas implementadas. Os demais contextos (`customers`,
`catalog`, `work-orders`, `inventory`, `invoicing`) estão com as pastas vazias de propósito:
entidades, use cases e funcionalidades serão adicionados junto com cada feature. O padrão completo
está em [`apps/api/src/modules/README.md`](apps/api/src/modules/README.md).

## Status do projeto

O projeto está **no início**. O scaffold do monorepo, a API base e o contexto de identity (tenants,
accounts e autenticação) já estão implementados. As demais funcionalidades de negócio ainda não
foram implementadas.

## IA no desenvolvimento: uma visão pragmática

Este projeto também é um espaço para discutir um ponto importante: precisamos ter uma **visão
pragmática sobre o uso de IA no desenvolvimento de software**.

A IA é uma ferramenta fantástica, mas é preciso **balancear velocidade, qualidade e segurança**. Ao
longo do desenvolvimento do Serviço Certo, vou abordar como esse equilíbrio é feito na prática.

## Ideias e sugestões

Tem uma ideia, dúvida ou sugestão? Compartilhe!

- Abra uma [issue](https://github.com/K4w4n/servico-certo/issues) com sua proposta.
- Ou me chame para conversar.

## Licença

A definir — o projeto é open source e a licença será publicada em breve.
