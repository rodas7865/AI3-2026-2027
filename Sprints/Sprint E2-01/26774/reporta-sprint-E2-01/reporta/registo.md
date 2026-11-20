# Registo · Reporta

## Sprint E2-01 · Diagnóstico inicial

**(a)** _(responder pelas palavras do grupo)_

**(b)** _(responder pelas palavras do grupo)_

**(c)** _(responder pelas palavras do grupo)_

**(d)** _(responder pelas palavras do grupo)_

## 4.1 · Estratégia de pedidos

| Pedido | `Cache-Control` | Quem o faz (página / SW) | Funciona sem rede? | Pode ser repetido sem efeitos adicionais? |
|---|---|---|---|---|
| `GET /v1/categorias` | `public, max-age=3600` | página | não (a página usa a cópia em `meta`) | sim |
| `GET /v1/ocorrencias/semelhantes` | `no-store` | página | não | sim |
| `GET /v1/ocorrencias?bbox=` | `no-store` | página | não | sim |
| `POST /v1/ocorrencias` sem `Idempotency-Key` | `no-store` | SW | não (fica na fila) | não |
| `POST /v1/ocorrencias` com `Idempotency-Key` | `no-store` | SW | não (fica na fila) | sim |
| `POST /v1/ocorrencias/{id}/reforcos` com `Idempotency-Key` | `no-store` | SW | não (fica na fila) | sim |
| `GET /v1/ocorrencias/alteracoes` | `no-store` | SW | não | sim |

### Antes de avançar

- **Que identifica o cidadão em cada pedido protegido?** Sem OAuth: o cabeçalho `X-Cidadao` (UUID guardado em `meta`). Com OAuth: o cookie de sessão `HttpOnly`.
- **Pode uma resposta de `semelhantes` ser servida da Cache API?** _(responder pelas palavras do grupo)_
