## 4.4 - Reflexão

### 1. Qual foi o critério que usou para decidir entre elemento e atributo? Aplique-o ao `telefone` do cliente e justifique a decisão que tomou.

O critério que usei foi considerar como elementos os dados que representam informação própria e que podem ter conteúdo ou estrutura. Os atributos são usados para informações simples que caracterizam ou identificam um elemento.

No caso do `telefone`, escolhi representá-lo como elemento (`<telefone>`) porque é uma informação própria do cliente e pode ser necessário consultar ou tratar esse valor individualmente.

### 2. Indique um dado da sua fatura que poderia ser atributo e um que não poderia. O que os distingue?

O `codigo` do produto poderia ser representado como um atributo do elemento `produto`, por exemplo `<produto codigo="P001">`.

Já a `designacao` não seria adequada como atributo neste caso, pois representa uma informação própria do produto e pode ser considerada parte do seu conteúdo.

A principal diferença é que o atributo serve para caracterizar o elemento, enquanto o elemento representa um dado com conteúdo próprio dentro da estrutura.

### 3. Um serviço Web recebe a sua fatura e precisa de calcular o total. Esse valor deve estar no ficheiro ou ser calculado por quem o lê? Que argumentos há para cada opção?

O total pode ser calculado por quem lê a fatura, usando a quantidade e o preço de cada produto. Esta opção evita guardar informação que pode ficar desatualizada quando os produtos são alterados.

Por outro lado, guardar o total no ficheiro pode ser útil para evitar que o valor tenha de ser calculado novamente e permite guardar o valor final que foi apresentado ao cliente.

Neste caso, considero mais adequado calcular o total a partir dos produtos, garantindo que o valor é obtido diretamente dos dados existentes na fatura.

### 4. A sua estrutura permite representar uma fatura sem produtos? E uma fatura com dois clientes? O XML, por si só, impede alguma destas situações?

A minha estrutura permite representar uma fatura sem produtos, porque o XML não obriga a que exista pelo menos um elemento `produto` dentro de `produtos`.

Também seria possível representar dois clientes, adicionando dois elementos `cliente` dentro de `cabecalho`.

O XML, por si só, não impede nenhuma destas situações. As regras sobre a quantidade obrigatória de produtos ou clientes teriam de ser definidas pela aplicação ou por mecanismos de validação específicos.

### 5. Dois colegas resolveram o ponto 1 com hierarquias diferentes e ambos os ficheiros são bem formados. Que problema é que isso levanta a quem tem de escrever o programa que lê estas faturas?

O problema é que o programa teria de conhecer as diferentes estruturas para conseguir encontrar corretamente os dados.

Por exemplo, se num ficheiro o `cliente` estiver diretamente dentro de `fatura` e noutro estiver dentro de `cabecalho`, o programa não pode assumir sempre o mesmo caminho para encontrar essa informação.

Por isso, é importante definir uma estrutura comum para que os programas que leem as faturas saibam onde encontrar cada informação.