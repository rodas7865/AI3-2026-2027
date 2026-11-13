const NOME_BD = 'sugestoes-bd';
const VERSAO_BD = 2;

let promessaAbertura = null;

function abrirBD() {
  if (!('indexedDB' in globalThis)) {
    return Promise.reject(new Error('IndexedDB não está disponível neste contexto.'));
  }
  if (promessaAbertura) return promessaAbertura;

  promessaAbertura = new Promise((resolve, reject) => {
    const pedido = indexedDB.open(NOME_BD, VERSAO_BD);

    pedido.onupgradeneeded = (evento) => {
      const bd = pedido.result;
      if (evento.oldVersion < 1) {
        const loja = bd.createObjectStore('sugestoes', { keyPath: 'id' });
        loja.createIndex('porEstado', 'estado', { unique: false });
        loja.createIndex('porData', 'dataCriacao', { unique: false });
        bd.createObjectStore('pendentes', { keyPath: 'idLocal', autoIncrement: true });
        bd.createObjectStore('meta', { keyPath: 'chave' });
      }
      if (evento.oldVersion < 2) {
        const pendentes = pedido.transaction.objectStore('pendentes');
        pendentes.createIndex('porUtilizador', 'utilizador', { unique: false });
        pendentes.openCursor().onsuccess = (e) => {
          const cursor = e.target.result;
          if (!cursor) return;
          cursor.update({
            ...cursor.value,
            chave: crypto.randomUUID(),
            tentativas: 0,
            ultimaTentativa: null
          });
          cursor.continue();
        };
      }
    };

    pedido.onsuccess = () => {
      const bd = pedido.result;
      bd.onversionchange = () => {
        bd.close();
        promessaAbertura = null;
        globalThis.dispatchEvent(new Event('bd:versao-nova'));
      };
      bd.onclose = () => { promessaAbertura = null; };
      resolve(bd);
    };
    pedido.onerror = () => reject(pedido.error);
    pedido.onblocked = () => console.warn('sugestoes-bd: atualização à espera de que outra ligação feche.');
  }).catch((erro) => {
    promessaAbertura = null;
    throw erro;
  });

  return promessaAbertura;
}

function transacionar(lojas, modo, preparar) {
  return abrirBD().then((bd) => new Promise((resolve, reject) => {
    const transacao = bd.transaction(lojas, modo);
    let resultado;

    transacao.oncomplete = () => resolve(resultado);
    transacao.onerror = () => reject(transacao.error ?? new Error('A transação IndexedDB falhou.'));
    transacao.onabort = () => reject(transacao.error ?? new Error('A transação IndexedDB foi cancelada.'));

    try {
      preparar(transacao, (valor) => { resultado = valor; });
    } catch (erro) {
      transacao.abort();
      reject(erro);
    }
  }));
}

function lerPendentesDe(utilizador) {
  return transacionar(['pendentes'], 'readonly', (transacao, definirResultado) => {
    const pedido = transacao.objectStore('pendentes').index('porUtilizador').getAll(utilizador);
    pedido.onsuccess = () => definirResultado(pedido.result.filter((p) => p.erro === null));
  });
}

function contarPendentes(utilizador) {
  return lerPendentesDe(utilizador).then((lista) => lista.length);
}

function registarTentativa(idLocal) {
  return transacionar(['pendentes'], 'readwrite', (transacao) => {
    const loja = transacao.objectStore('pendentes');
    const pedido = loja.get(idLocal);
    pedido.onsuccess = () => {
      if (!pedido.result) return;
      loja.put({
        ...pedido.result,
        tentativas: (pedido.result.tentativas ?? 0) + 1,
        ultimaTentativa: new Date().toISOString()
      });
    };
  });
}

function lerCursor(utilizador) {
  return transacionar(['meta'], 'readonly', (transacao, definirResultado) => {
    const pedido = transacao.objectStore('meta').get(`cursor:${utilizador}`);
    pedido.onsuccess = () => definirResultado(pedido.result?.valor ?? 0);
  });
}

function aplicarAlteracoes(utilizador, alteracoes, cursor) {
  return transacionar(['sugestoes', 'meta'], 'readwrite', (transacao) => {
    const sugestoes = transacao.objectStore('sugestoes');
    for (const sugestao of alteracoes) sugestoes.put(sugestao);
    const meta = transacao.objectStore('meta');
    meta.put({ chave: `cursor:${utilizador}`, valor: cursor });
    meta.put({ chave: 'sugestoesAtualizadoEm', valor: new Date().toISOString() });
  });
}

function substituirSugestoes(lista) {
  return transacionar(['sugestoes', 'meta'], 'readwrite', (transacao) => {
    const sugestoes = transacao.objectStore('sugestoes');
    sugestoes.clear();
    for (const sugestao of lista) sugestoes.put(sugestao);
    transacao.objectStore('meta').put({
      chave: 'sugestoesAtualizadoEm',
      valor: new Date().toISOString()
    });
  });
}

function guardarSugestao(sugestao) {
  return transacionar(['sugestoes', 'meta'], 'readwrite', (transacao) => {
    transacao.objectStore('sugestoes').put(sugestao);
    transacao.objectStore('meta').put({
      chave: 'sugestoesAtualizadoEm',
      valor: new Date().toISOString()
    });
  });
}

function lerSugestoes(ordenacao = 'recentes') {
  return transacionar(['sugestoes'], 'readonly', (transacao, definirResultado) => {
    const indice = ordenacao === 'estado' ? 'porEstado' : 'porData';
    const direcao = ordenacao === 'estado' ? 'next' : 'prev';
    const pedido = transacao.objectStore('sugestoes').index(indice).openCursor(null, direcao);
    const lista = [];
    pedido.onsuccess = () => {
      const cursor = pedido.result;
      if (!cursor) {
        definirResultado(lista);
        return;
      }
      lista.push(cursor.value);
      cursor.continue();
    };
  });
}

function lerAtualizadoEm() {
  return transacionar(['meta'], 'readonly', (transacao, definirResultado) => {
    const pedido = transacao.objectStore('meta').get('sugestoesAtualizadoEm');
    pedido.onsuccess = () => definirResultado(pedido.result?.valor ?? null);
  });
}

function acrescentarPendente(dados, utilizador) {
  return transacionar(['pendentes'], 'readwrite', (transacao, definirResultado) => {
      const pedido = transacao.objectStore('pendentes').add({
      utilizador,
      titulo: dados.titulo,
      descricao: dados.descricao,
      categoria: dados.categoria,
      criadaEm: new Date().toISOString(),
      erro: null,
      chave: crypto.randomUUID(),
      tentativas: 0,
      ultimaTentativa: null
    });
    pedido.onsuccess = () => definirResultado(pedido.result);
  });
}

function lerPendentes() {
  return transacionar(['pendentes'], 'readonly', (transacao, definirResultado) => {
    const pedido = transacao.objectStore('pendentes').getAll();
    pedido.onsuccess = () => definirResultado(pedido.result);
  });
}

function marcarErro(idLocal, mensagem) {
  return transacionar(['pendentes'], 'readwrite', (transacao) => {
    const loja = transacao.objectStore('pendentes');
    const pedido = loja.get(idLocal);
    pedido.onsuccess = () => {
      if (pedido.result) loja.put({ ...pedido.result, erro: mensagem });
    };
  });
}

function descartarPendente(idLocal) {
  return transacionar(['pendentes'], 'readwrite', (transacao) => {
    transacao.objectStore('pendentes').delete(idLocal);
  });
}

function confirmarPendente(idLocal, sugestao) {
  return transacionar(['pendentes', 'sugestoes'], 'readwrite', (transacao) => {
    transacao.objectStore('pendentes').delete(idLocal);
    transacao.objectStore('sugestoes').put(sugestao);
  });
}

function lerProprietario() {
  return transacionar(['meta'], 'readonly', (transacao, definirResultado) => {
    const pedido = transacao.objectStore('meta').get('proprietario');
    pedido.onsuccess = () => definirResultado(pedido.result ?? null);
  });
}

function guardarProprietario(sessao) {
  return transacionar(['meta'], 'readwrite', (transacao) => {
    transacao.objectStore('meta').put({
      chave: 'proprietario',
      utilizador: sessao.utilizador,
      nome: sessao.nome,
      papel: sessao.papel,
      expiracao: sessao.expiracao,
      atualizadoEm: new Date().toISOString()
    });
  });
}

function limparBD() {
  return transacionar(['sugestoes', 'pendentes', 'meta'], 'readwrite', (transacao) => {
    transacao.objectStore('sugestoes').clear();
    transacao.objectStore('pendentes').clear();
    transacao.objectStore('meta').clear();
  });
}
