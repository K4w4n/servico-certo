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
│  │  │  ├─ modules/        # contextos de negócio (camadas vazias por enquanto)
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

# 3. (Opcional) Sobrescreva a URL da API usada pelo web
cp apps/web/.env.example apps/web/.env.local

# 4. Suba API e web em modo desenvolvimento
pnpm dev
```

| Serviço      | URL                          |
| ------------ | ---------------------------- |
| Web          | http://localhost:3000        |
| API          | http://localhost:3001        |
| Health check | http://localhost:3001/health |
| Swagger      | http://localhost:3001/docs   |

O banco padrão em desenvolvimento é o SQLite, criado automaticamente em `apps/api/.data/dev.sqlite`.

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

> Ainda não há migrations neste scaffold. A pasta `apps/api/src/database/migrations` está pronta
> para receber a primeira quando o modelo de dados for definido.

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

As pastas já existem, mas estão vazias de propósito: entidades, use cases e funcionalidades serão
adicionados junto com cada feature. O padrão completo está em
[`apps/api/src/modules/README.md`](apps/api/src/modules/README.md).

## Status do projeto

O projeto está **no início**. Este repositório contém o scaffold do monorepo, a API base com health
check e a interface inicial. As funcionalidades de negócio ainda não foram implementadas.

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
