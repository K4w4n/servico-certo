# Módulos de negócio

Cada contexto de negócio (`identity`, `customers`, `products`, `work-orders`, `inventory`,
`invoicing`) segue o mesmo layout de Clean Architecture:

```
<module>/
├─ domain/           # entidades, value objects, erros e interfaces de repositório
├─ application/      # use cases, queries e ports
├─ infrastructure/   # implementações de persistência e integrações externas
└─ presentation/     # controllers, DTOs e presenters HTTP
```

## Regra de dependência

```
presentation ──▶ application ──▶ domain
infrastructure ─▶ application ──▶ domain
                      ▲
         (implementa as ports do domínio/aplicação)
```

- `domain` não importa Nest, Knex, zod ou qualquer detalhe externo.
- `application` depende apenas de `domain` e das próprias ports.
- `infrastructure` e `presentation` dependem para dentro, nunca entre si.
- Comunicação entre contextos acontece por ports ou eventos de domínio.
- O `<module>.module.ts` é o único lugar que conhece todas as camadas e faz a
  composição das dependências.

Os contextos `identity`, `customers` e `products` já estão implementados com as
quatro camadas. Os demais contextos estão com as pastas vazias de propósito: o
código de cada camada nasce junto com a funcionalidade correspondente.
