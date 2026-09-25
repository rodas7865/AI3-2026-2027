| Falha introduzida | Ficheiro | Mal formado ou inválido? | Mensagem obtida | O que a mensagem permitiu (ou não) concluir |
|---|---|---|---|---|
| Retirar uma etiqueta de fecho | aviso-valida.xml | invalido | This page contains the following errors:
error on line 8 at column 9: Opening and ending tag mismatch: telefone line 7 and aviso | Que existe uma tag com erros de abertura ou fexamento. |
| Pôr texto onde é esperado um número | aviso-valida.xml | Mal formado | cvc-type.3.1.3: The value 'ug' of element 'telefone' is not valid. | O valor não é valido no elemento telefone|
| Trocar a ordem de dois elementos | aviso-valida.xml | Mal formado | Element name 'numerotrabalho' is invalid.

One of the following is expected:
 - nome

Error indicated by:
 {the schema}
with code:xml(cvc-complex-type.2.4.a) | Algo esta a ser esperado pelo xml. |


| Construção | Onde a usou | O que ficou a ser exigido | O que continua a ser permitido |
|---|---|---|---|
| `xsd:complexType` | | | |
| `xsd:sequence` | | | |
| `xsd:attribute` com `use` | | | |
| `minOccurs` / `maxOccurs` | | | |
| `mixed="true"` *(de `aviso.xsd`)* | | | |