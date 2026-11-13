function erroDeSincronizacao(tipo, mensagem) {
  const erro = new Error(mensagem);
  erro.tipo = tipo;
  return erro;
}

async function pedir(url, opcoes) {
  try {
    return await fetch(url, { credentials: 'include', ...opcoes });
  } catch {
    throw erroDeSincronizacao('sem-rede', 'Sem rede.');
  }
}

async function textoDoErro(resposta) {
  const corpo = await resposta.json().catch(() => null);
  const base = corpo?.mensagem ?? `Erro ${resposta.status}.`;
  const detalhe = corpo?.detalhes?.[0]?.problema;
  return detalhe ? `${base} ${detalhe}` : base;
}

async function executarSincronizacao() {
  const proprietario = await lerProprietario();
  if (!proprietario) return { tipo: 'sessao-expirada', porEnviar: 0 };

  const utilizador = proprietario.utilizador;
  if (new Date(proprietario.expiracao) <= Date.now()) {
    return { tipo: 'sessao-expirada', porEnviar: await contarPendentes(utilizador) };
  }

  let enviadas = 0;
  let recusadas = 0;

  // 1. Push: esvaziar a fila de saída, uma de cada vez, pela ordem de idLocal
  for (const pendente of await lerPendentesDe(utilizador)) {
    await registarTentativa(pendente.idLocal);
    const resposta = await pedir('/v2/sugestoes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': pendente.chave },
      body: JSON.stringify({
        titulo: pendente.titulo,
        descricao: pendente.descricao,
        categoria: pendente.categoria
      })
    });

    if (resposta.status === 201) {
      await confirmarPendente(pendente.idLocal, await resposta.json());
      enviadas += 1;
    } else if (resposta.status === 401) {
      return { tipo: 'sessao-expirada', porEnviar: await contarPendentes(utilizador) };
    } else if (resposta.status >= 400 && resposta.status < 500) {
      await marcarErro(pendente.idLocal, await textoDoErro(resposta));
      recusadas += 1;
    } else {
      throw erroDeSincronizacao('erro-servidor', `O servidor respondeu ${resposta.status}.`);
    }
  }

  // 2. Pull: só se a fila foi toda tratada
  const cursor = await lerCursor(utilizador);
  const resposta = await pedir(`/v2/sugestoes/alteracoes?desde=${cursor}`);
  if (resposta.status === 401) {
    return { tipo: 'sessao-expirada', porEnviar: await contarPendentes(utilizador) };
  }
  if (!resposta.ok) {
    throw erroDeSincronizacao('erro-servidor', `O servidor respondeu ${resposta.status}.`);
  }
  const dados = await resposta.json();
  await aplicarAlteracoes(utilizador, dados.alteracoes, dados.cursor);

  return {
    tipo: 'sincronizado',
    enviadas,
    recusadas,
    recebidas: dados.alteracoes.length,
    porEnviar: await contarPendentes(utilizador)
  };
}