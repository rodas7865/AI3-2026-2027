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
- **Pode uma resposta de `semelhantes` ser servida da Cache API?** Não. As candidatas dependem da localização e da lista atual de ocorrências, pelo que uma resposta pode ficar desactualizada e deve usar `no-store`.

## Sprint E2-02 · Evidência de aceitação

Os testes seguintes são executados na raiz `Sprints/Sprint E2-02/servidor`.

```bash
curl -i http://localhost:3000/v1/categorias
curl -i "http://localhost:3000/v1/ocorrencias/semelhantes?categoria=buraco&lat=40.650&lng=-7.900"
curl -i "http://localhost:3000/v1/ocorrencias?bbox=-7.95,40.60,-7.85,40.70"
curl -i "http://localhost:3000/v1/ocorrencias/alteracoes?desde=0" -H "X-Cidadao: 11111111-1111-4111-8111-111111111111"
```

### Evidência executada

```bash
curl -i http://localhost:3000/swagger
# HTTP/1.1 302 Found
# Location: /swagger.html

curl -i http://localhost:3000/openapi/reporta.openapi.yaml
# HTTP/1.1 200 OK
# Content-Type: application/yaml
# devolve o reporta.openapi.yaml usado pela interface Swagger
```

```bash
curl -i http://localhost:3000/v1/categorias
# HTTP/1.1 200 OK
# devolve buraco=15 m, semaforo=25 m, iluminacao=30 m, sinalizacao=20 m, outro=25 m

curl -i -X POST http://localhost:3000/v1/ocorrencias \
  -H "X-Cidadao: 11111111-1111-4111-8111-111111111111" \
  -H "Idempotency-Key: aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" \
  -H "Content-Type: application/json" \
  --data '{"categoria":"buraco","descricao":"Buraco grande na rua","localizacao":{"lat":40.65,"lng":-7.9}}'
# HTTP/1.1 201
# {"resultado":"criada","ocorrencia":{"comunicacoes":1,...}}

curl -i -X POST http://localhost:3000/v1/ocorrencias \
  -H "X-Cidadao: 22222222-2222-4222-8222-222222222222" \
  -H "Content-Type: application/json" \
  --data '{"categoria":"buraco","descricao":"Buraco junto ao passeio","localizacao":{"lat":40.65005,"lng":-7.9}}'
# HTTP/1.1 200
# {"resultado":"reforcada","ocorrencia":{"comunicacoes":2,...}}

curl -i -X POST http://localhost:3000/v1/ocorrencias \
  -H "X-Cidadao: 11111111-1111-4111-8111-111111111111" \
  -H "Idempotency-Key: aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" \
  -H "Content-Type: application/json" \
  --data '{"categoria":"buraco","descricao":"Buraco grande na rua","localizacao":{"lat":40.65,"lng":-7.9}}'
# HTTP/1.1 201, Idempotent-Replayed: true

curl -i -X PATCH http://localhost:3000/v1/admin/ocorrencias/1 \
  -H "X-Admin-Token: mudar-isto" \
  -H "Content-Type: application/json" \
  --data '{"estado":"resolvida"}'
# HTTP/1.1 200
# {"estado":"resolvida","versao":3,...}

curl -i -X POST http://localhost:3000/v1/ocorrencias/1/reforcos \
  -H "X-Cidadao: 22222222-2222-4222-8222-222222222222"
# HTTP/1.1 410
# {"codigo":"resolvida","mensagem":"A ocorrência está resolvida e já não aceita reforços"}
```
