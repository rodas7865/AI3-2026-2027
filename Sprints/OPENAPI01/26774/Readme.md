    | Alteração introduzida | Sintaxe YAML errada, OpenAPI inválido, exemplo inválido ou válido? | Ferramenta | Mensagem obtida | O que a mensagem permitiu (ou não) concluir |
    | --- | --- | --- | --- | --- |
    | Usar uma tabulação na indentação de uma linha |  |  |  |  |
    | Retirar as plicas de um `$ref` |  |  |  |  |
    | Retirar a `description` de uma resposta |  |  |  |  |
    | Retirar o `required: true` do parâmetro de caminho `id` |  |  |  |  |
    | Pôr `estado: fechada` no exemplo da sugestão |  |  |  |  |
    | Retirar o cabeçalho `Cache-Control` do `200` de `listarCategorias` |  |  |  |  |


    | Construção | Onde a usou | O que ficou a ser exigido | O que continua a ser permitido |
    | --- | --- | --- | --- |
    | parâmetro `in: path` |  |  |  |
    | parâmetro `in: query` |  |  |  |
    | `requestBody` + `$ref` |  |  |  |
    | `allOf` + `readOnly` |  |  |  |
    | `nullable` |  |  |  |
    | resposta `201` + `Location` |  |  |  |
    | `Cache-Control` |  |  |  |
    | `ETag` + `If-Match` |  |  |  |
