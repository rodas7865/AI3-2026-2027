## 11. Testes de erros

| Falha introduzida | Ficheiro | Mal formado ou inválido? | Mensagem obtida | O que a mensagem permitiu (ou não) concluir |
|---|---|---|---|---|
| Retirar uma etiqueta de fecho | produto.xml | Mal formado| Premature end of data in tag Product line 3 | Permitiu 
concluir que a etiqueta <Product> foi aberta mas não foi fechada corretamente. |

| Pôr texto onde é esperado um número | produto.xml | Inválido | Element 'Price': 'abc' is not a valid value of the atomic type 'xs:decimal'. | Permitiu concluir que o valor de Price não respeita o tipo xs:decimal definido no XSD. |

| Trocar a ordem de dois elementos | produto.xml | Inválido | Element 'ProductType': This element is not expected. Expected is ( ProductName ). | Permitiu concluir que os elementos têm de respeitar a ordem definida no xsd:sequence. |

## 12. Construções utilizadas no XSD

| Construção | Onde a usou | O que ficou a ser exigido | O que continua a ser permitido |
|---|---|---|---|
| `xsd:complexType` | `Product` e `Provider` | Define uma estrutura composta por vários elementos | Permite organizar vários elementos dentro da mesma estrutura |
| `xsd:sequence` | `Product` e `Provider` | Os elementos têm de aparecer pela ordem definida | Permite os elementos definidos dentro da sequência |
| `xsd:attribute` com `use` | `ProductID` | `ProductID` é obrigatório | `Category` continua opcional |
| `minOccurs / maxOccurs` | `Provider` | O `Provider` pode aparecer entre 0 e 3 vezes | Permite ter 0, 1, 2 ou 3 fornecedores |
| `mixed="true"` (de `aviso.xsd`) | `aviso` | Os elementos continuam sujeitos à ordem e multiplicidade definidas | Permite texto livre entre os elementos |

## 13. Reflexão

### 1. Na ficha anterior, dois colegas produziram faturas bem formadas com hierarquias diferentes. Um schema resolve esse problema? Quem tem de o escrever, e quando, para que resolva?

Sim. Um schema pode resolver esse problema porque define uma estrutura específica que os documentos têm de seguir para serem considerados válidos.

O schema deve ser definido por quem desenvolve ou especifica o formato dos dados, antes de os documentos serem produzidos e utilizados pelos programas. Assim, todos os documentos devem seguir a mesma estrutura definida pelo schema.

### 2. O `Price` do produto é um número. Que valores absurdos o seu schema continua a aceitar? O que faria falta para os impedir?

O tipo `xs:decimal` garante que o valor é um número decimal, mas continua a aceitar valores que podem não fazer sentido para um preço, como valores negativos ou valores excessivamente elevados.

Para impedir esses valores seria necessário acrescentar restrições ao schema, como um valor mínimo (`minInclusive`) e, se necessário, um valor máximo (`maxInclusive`).

### 3. Um documento é válido hoje. Amanhã acrescenta-se um elemento novo ao schema, obrigatório. O que acontece a todos os documentos já existentes? Que escolha de multiplicidade teria evitado o problema?

Os documentos antigos deixariam de ser válidos porque não possuem o novo elemento obrigatório.

Para evitar este problema, o novo elemento poderia ser definido como opcional, utilizando `minOccurs="0"`. Desta forma, os documentos antigos continuariam válidos mesmo sem esse elemento.

### 4. Compare o custo de validar com o custo de não validar: que erros passam a ser detetados no momento certo, e que trabalho é que isso poupa a quem escreve o programa leitor?

Validar tem um custo inicial, porque é necessário criar e manter o schema e validar os documentos. No entanto, permite detetar erros antes de os dados chegarem ao programa que os vai utilizar.

Por exemplo, podem ser detetados tipos de dados incorretos, elementos em falta, elementos inesperados ou valores que não respeitam as regras definidas.

Isto reduz o trabalho do programador porque o programa leitor pode assumir que os documentos cumprem a estrutura esperada, evitando ter de criar tantas verificações e tratamentos de erros.

### 5. O `mixed="true"` permite texto livre entre os elementos. Que tipo de documentos ficaria impossível de especificar sem esse mecanismo? Dê um exemplo diferente do desta ficha.

Sem `mixed="true"`, seria difícil especificar documentos em que texto normal aparece misturado com elementos dentro do mesmo conteúdo.

Por exemplo, num documento de um livro poderíamos ter:

`Este produto está <destaque>temporariamente indisponível</destaque> para compra.`

Neste caso existe texto antes e depois do elemento `destaque`. O `mixed="true"` permite que esse texto apareça juntamente com o elemento.