11.
| Falha | Ficheiro | Mal formado ou inválido? | Mensagem obtida | O que a mensagem permitiu concluir |
|---|---|---|---|---|
| Retirar etiqueta de fecho | produto.xml | Mal formado | "XML document structures must start and end within the same entity. Closing tag expected here." | O erro é estrutural — o parser detetou que uma tag foi aberta e nunca fechada, antes sequer de tentar validar contra o schema. Não há referência ao `.xsd` na mensagem, o que confirma que a boa formação é verificada primeiro e independentemente da validade |
| Pôr texto onde é esperado um número | produto.xml | Inválido | "cvc-type.3.1.3: The value 'caro' of element 'Price' is not valid. Content of type 'decimal' is expected." | O documento continua bem formado — o XML está estruturalmente correto. O erro só aparece na fase de validação contra o `xsd:decimal`, e a mensagem já indica o elemento (`Price`), o valor recusado ('caro') e o tipo esperado (decimal) |
| Trocar a ordem de dois elementos | produto.xml | Inválido | "Element name 'ProductType' is invalid. One of the following is expected: - ProductName" (código cvc-complex-type.2.4.a) | O documento continua bem formado — a estrutura de tags está correta. O erro é só de validade: o `xsd:sequence` exige que `ProductName` apareça antes de `ProductType`, e ao trocá-los o validador encontra `ProductType` no lugar onde esperava `ProductName`, e diz exatamente o que esperava ali |

12.
| Construção | Onde a usou | O que ficou a ser exigido | O que continua a ser permitido |
|---|---|---|---|
| `xsd:complexType` | No elemento `Product` (e no `Provider`, aninhado) | Que `Product` só tenha os elementos e atributos declarados, na estrutura definida | Nada fora disso — não são aceites elementos ou atributos extra |
| `xsd:sequence` | Dentro do `complexType` de `Product` | Que `ProductName`, `ProductType`, `Price`, `Class`, `Company` (e `Provider`) apareçam por esta ordem exata | Os valores dentro de cada elemento continuam livres, desde que respeitem o tipo |
| `xsd:attribute` com `use` | `ProductID` com `use="required"`; `Category` sem `use` | Que `ProductID` esteja sempre presente | `Category` pode ser omitido (é opcional por omissão) |
| `minOccurs` / `maxOccurs` | No elemento `Provider` (`minOccurs="0" maxOccurs="3"`) | Que não apareçam mais de 3 `Provider` | Que o produto não tenha nenhum `Provider` (0 é aceite) |
| `mixed="true"` (de `aviso.xsd`) | No `complexType` do elemento `aviso` | Que os elementos `nome`, `numerotrabalho`, `dataentrega` e o `choice` de contactos respeitem a ordem/multiplicidade declaradas | Que exista texto livre entre os elementos marcados |