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

Os IDs de ocorrência são UUIDs, gerados com `crypto.randomUUID()`. O esquema OpenAPI usa `string/uuid` nos IDs e em `recusadas`, para corresponder ao servidor. As categorias mantêm os raios do contrato: buraco 15 m, semáforo 25 m, iluminação 30 m, sinalização 20 m e outro 25 m.

Todos os comandos abaixo são executados na pasta `Sprints/Sprint E2-02/servidor`, com o servidor em `localhost:3000`. Os exemplos de erro devolvem JSON no formato `{"codigo":"...","mensagem":"..."}`.

### Categorias, identidade e validação

```bash
curl -i http://localhost:3000/v1/categorias
# 200; Cache-Control: public, max-age=3600; devolve as cinco categorias e respetivos raios.

curl -i http://localhost:3000/v1/ocorrencias/alteracoes?desde=0
# 401; {"codigo":"nao-identificado","mensagem":"Cabeçalho X-Cidadao em falta ou inválido"}

curl -i -X POST http://localhost:3000/v1/ocorrencias \
  -H "X-Cidadao: 11111111-1111-4111-8111-111111111111" \
  -H "Content-Type: application/json" \
  --data '{"categoria":"buraco","descricao":"curta","localizacao":{"lat":40.65,"lng":-7.9}}'
# 400; {"codigo":"pedido-invalido","mensagem":"Corpo da ocorrência inválido"}
```

### Criação, duplicados, reforço e leituras

```bash
curl -i -X POST http://localhost:3000/v1/ocorrencias \
  -H "X-Cidadao: 11111111-1111-4111-8111-111111111111" \
  -H "Content-Type: application/json" \
  --data '{"categoria":"buraco","descricao":"Buraco grande na rua","localizacao":{"lat":40.65,"lng":-7.9}}'
# 201; resultado "criada", comunicacoes 1 e id UUID.
# Copiar o UUID devolvido para ID antes dos exemplos seguintes.
ID="<uuid devolvido>"

curl -i -X POST http://localhost:3000/v1/ocorrencias \
  -H "X-Cidadao: 22222222-2222-4222-8222-222222222222" \
  -H "Content-Type: application/json" \
  --data '{"categoria":"buraco","descricao":"Buraco junto ao passeio","localizacao":{"lat":40.65005,"lng":-7.9}}'
# 200; resultado "reforcada", o mesmo id e comunicacoes 2.

curl -i -X POST http://localhost:3000/v1/ocorrencias \
  -H "X-Cidadao: 11111111-1111-4111-8111-111111111111" \
  -H "Content-Type: application/json" \
  --data '{"categoria":"buraco","descricao":"Buraco grande na rua","localizacao":{"lat":40.65,"lng":-7.9}}'
# 200; resultado "ja-comunicada", comunicacoes continua em 2.

curl -i "http://localhost:3000/v1/ocorrencias/semelhantes?categoria=buraco&lat=40.65&lng=-7.9"
# 200; candidatas ordenadas por distância, no máximo cinco; Cache-Control: no-store.

curl -i "http://localhost:3000/v1/ocorrencias?bbox=-7.95,40.60,-7.85,40.70"
# 200; lista de ocorrências não resolvidas dentro da caixa; Cache-Control: no-store.

curl -i "http://localhost:3000/v1/ocorrencias/$ID/fotografia"
# 404 se não foi enviada fotografia; erro no esquema Erro.

curl -i -X POST http://localhost:3000/v1/ocorrencias \
  -H "X-Cidadao: 33333333-3333-4333-8333-333333333333" \
  -H "Content-Type: application/json" \
  --data "{\"categoria\":\"buraco\",\"descricao\":\"Buraco grande na rua\",\"localizacao\":{\"lat\":40.65,\"lng\":-7.9},\"recusadas\":[\"$ID\"]}"
# 201; recusada não é escolhida como semelhante e nasce um UUID diferente.

curl -i -X POST http://localhost:3000/v1/ocorrencias \
  -H "X-Cidadao: 55555555-5555-4555-8555-555555555555" \
  -H "Content-Type: application/json" \
  --data '{"categoria":"semaforo","descricao":"Semáforo sem funcionar","localizacao":{"lat":40.65,"lng":-7.9}}'
# 201; categoria diferente não reforça o buraco.

curl -i -X POST http://localhost:3000/v1/ocorrencias \
  -H "X-Cidadao: 66666666-6666-4666-8666-666666666666" \
  -H "Content-Type: application/json" \
  --data '{"categoria":"buraco","descricao":"Buraco longe do primeiro","localizacao":{"lat":40.652,"lng":-7.9}}'
# 201; distância superior ao raio de 15 m cria outra ocorrência.

curl -i -X POST http://localhost:3000/v1/ocorrencias \
  -H "X-Cidadao: 77777777-7777-4777-8777-777777777777" \
  -H "Idempotency-Key: nao-e-uuid" \
  -H "Content-Type: application/json" \
  --data '{"categoria":"outro","descricao":"Problema na via pública","localizacao":{"lat":41,"lng":-8}}'
# 400; Idempotency-Key inválida devolve Erro.

PHOTO="$(node -e 'const b=Buffer.from([255,216,255,217]);process.stdout.write(\"data:image/jpeg;base64,\"+b.toString(\"base64\"))')"
curl -i -X POST http://localhost:3000/v1/ocorrencias \
  -H "X-Cidadao: 88888888-8888-4888-8888-888888888888" \
  -H "Content-Type: application/json" \
  --data "{\"categoria\":\"outro\",\"descricao\":\"Ocorrência com fotografia\",\"localizacao\":{\"lat\":42,\"lng\":-8},\"fotografia\":\"$PHOTO\"}"
# 201; temFotografia true; os bytes são guardados separadamente do registo.
```

Acima do limite fotográfico, gerar uma data URL de 300 KiB + 1 byte e repetir o POST:

```bash
PHOTO="$(node -e 'const b=Buffer.alloc(307201);b[0]=255;b[1]=216;b[b.length-2]=255;b[b.length-1]=217;process.stdout.write(\"data:image/jpeg;base64,\"+b.toString(\"base64\"))')"
curl -i -X POST http://localhost:3000/v1/ocorrencias \
  -H "X-Cidadao: 99999999-9999-4999-8999-999999999999" \
  -H "Content-Type: application/json" \
  --data "{\"categoria\":\"outro\",\"descricao\":\"Fotografia demasiado grande\",\"localizacao\":{\"lat\":43,\"lng\":-8},\"fotografia\":\"$PHOTO\"}"
# 400; fotografia rejeitada pelo limite de 300 KiB.

### Idempotência

```bash
IDEMPOTENCY_KEY=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa
curl -i -X POST http://localhost:3000/v1/ocorrencias \
  -H "X-Cidadao: 33333333-3333-4333-8333-333333333333" \
  -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
  -H "Content-Type: application/json" \
  --data '{"categoria":"iluminacao","descricao":"Candeeiro apagado na rua","localizacao":{"lat":38.72,"lng":-9.14}}'
# 201; resultado "criada".

curl -i -X POST http://localhost:3000/v1/ocorrencias \
  -H "X-Cidadao: 33333333-3333-4333-8333-333333333333" \
  -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
  -H "Content-Type: application/json" \
  --data '{"categoria":"iluminacao","descricao":"Candeeiro apagado na rua","localizacao":{"lat":38.72,"lng":-9.14}}'
# Mesma resposta 201, Idempotent-Replayed: true; não cria outra ocorrência.

curl -i -X POST http://localhost:3000/v1/ocorrencias \
  -H "X-Cidadao: 33333333-3333-4333-8333-333333333333" \
  -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
  -H "Content-Type: application/json" \
  --data '{"categoria":"iluminacao","descricao":"Candeeiro diferente nesta rua","localizacao":{"lat":38.72,"lng":-9.14}}'
# 409; {"codigo":"conflito-chave","mensagem":"A chave já foi usada com outro corpo"}
```

As chaves ficam associadas ao cidadão, corpo e resposta durante 24 horas. O mesmo mecanismo é aplicado a `POST /v1/ocorrencias/{id}/reforcos`:

```bash
REFORCO_KEY=bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb
curl -i -X POST "http://localhost:3000/v1/ocorrencias/$ID/reforcos" \
  -H "X-Cidadao: aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" \
  -H "Idempotency-Key: $REFORCO_KEY" \
  -H "Content-Type: application/json" \
  --data '{}'
# 201; reforço aplicado. Repetir este comando devolve a resposta guardada e
# Idempotent-Replayed: true, sem incrementar comunicacoes novamente.

curl -i -X POST "http://localhost:3000/v1/ocorrencias/00000000-0000-4000-8000-000000000000/reforcos" \
  -H "X-Cidadao: aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
# 404; ocorrência inexistente.
```

### Administração, alterações e falhas simuladas

```bash
curl -i -X PATCH "http://localhost:3000/v1/admin/ocorrencias/$ID" \
  -H "X-Admin-Token: mudar-isto" \
  -H "Content-Type: application/json" \
  --data '{"estado":"resolvida"}'
# 200; estado "resolvida", versao e atualizadaEm atualizados.

curl -i "http://localhost:3000/v1/ocorrencias/alteracoes?desde=0" \
  -H "X-Cidadao: 11111111-1111-4111-8111-111111111111"
# 200; inclui a ocorrência alterada e devolve cursor.

curl -i -X POST "http://localhost:3000/v1/ocorrencias/$ID/reforcos" \
  -H "X-Cidadao: 44444444-4444-4444-8444-444444444444"
# 410; a ocorrência resolvida não aceita reforço.

curl -i "http://localhost:3000/v1/ocorrencias/alteracoes?desde=<cursor-anterior>" \
  -H "X-Cidadao: 22222222-2222-4222-8222-222222222222"
# 200; inclui a ocorrência atualizada para o cidadão que a reforçou.

curl -i "http://localhost:3000/v1/ocorrencias/alteracoes?desde=<cursor-anterior>" \
  -H "X-Cidadao: 33333333-3333-4333-8333-333333333333"
# 200; alteracoes vazio para cidadão que não comunicou nem reforçou a ocorrência.

# Iniciar o servidor com SIMULAR_503=1; o primeiro pedido /v1 devolve:
# HTTP/1.1 503 Service Unavailable
# Retry-After: 2
# {"codigo":"indisponivel","mensagem":"Serviço temporariamente indisponível"}

# Iniciar o servidor com SIMULAR_PERDA_RESPOSTA=1 e repetir o POST da secção
# Idempotência com curl --retry 1 --retry-all-errors --retry-delay 0:
# a primeira ligação fecha depois de guardar a ocorrência e a repetição devolve
# a resposta guardada com Idempotent-Replayed: true; comunicacoes permanece 1.
```

### Persistência

Depois de criar uma ocorrência, reiniciar o servidor e executar:

```bash
curl -i "http://localhost:3000/v1/ocorrencias?bbox=-7.95,40.60,-7.85,40.70"
# 200; devolve os registos persistidos após o reinício.
```

Os dados são guardados em `servidor/dados/ocorrencias.json` (incluindo a coleção separada de fotografias), ignorado pelo Git, sem base de dados nem dependências adicionais.
