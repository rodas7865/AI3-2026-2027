const express = require('express');
const estado = require('../estado');
const utilitarios = require('../utilitarios');

const router = express.Router();

function validarNovaOcorrencia(corpo) {
  if (!corpo || typeof corpo !== 'object') return false;
  if (!estado.categoriasIds.has(corpo.categoria)) return false;
  if (typeof corpo.descricao !== 'string') return false;
  if (corpo.descricao.length < 10 || corpo.descricao.length > 500) return false;
  if (!utilitarios.validarLocalizacao(corpo.localizacao)) return false;
  if (!utilitarios.validarFotografia(corpo.fotografia)) return false;
  if (corpo.recusadas !== undefined &&
      (!Array.isArray(corpo.recusadas) ||
       corpo.recusadas.some((id) => !Number.isInteger(id) || id < 1))) return false;
  return true;
}

router.get('/semelhantes', (req, res) => {
  const categoria = req.query.categoria;
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  if (!estado.categoriasIds.has(categoria) || !req.query.lat || !req.query.lng ||
      !Number.isFinite(lat) || !Number.isFinite(lng) ||
      lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return utilitarios.erro(res, 400, 'pedido-invalido', 'categoria, lat ou lng inválidos');
  }
  const candidatas = estado.procurarSemelhantes(categoria, { lat, lng })
    .slice(0, 5)
    .map((candidata) => ({
      ocorrencia: estado.ocorrenciaPublica(candidata.ocorrencia),
      distancia: candidata.distancia
    }));
  res.set('Cache-Control', 'no-store');
  res.json({ candidatas });
});

router.get('/alteracoes', (req, res) => {
  const cidadao = utilitarios.cidadaoValido(req, res);
  if (!cidadao) return;
  if (req.query.desde === undefined || !/^\d+$/.test(String(req.query.desde))) {
    return utilitarios.erro(res, 400, 'pedido-invalido', 'O parâmetro desde é inválido');
  }
  const desde = Number(req.query.desde);
  const alteracoes = [...estado.ocorrencias.values()]
    .filter((ocorrencia) =>
      ocorrencia.versao > desde &&
      Array.isArray(ocorrencia.comunicantes) &&
      ocorrencia.comunicantes.includes(cidadao))
    .map(estado.ocorrenciaPublica);
  res.set('Cache-Control', 'no-store');
  res.json({ alteracoes, cursor: estado.obterVersao() });
});

router.get('/', (req, res) => {
  if (!req.query.bbox) {
    return utilitarios.erro(res, 400, 'pedido-invalido', 'O parâmetro bbox é obrigatório');
  }
  const partes = String(req.query.bbox).split(',').map(Number);
  if (partes.length !== 4 || partes.some((valor) => !Number.isFinite(valor))) {
    return utilitarios.erro(res, 400, 'pedido-invalido', 'bbox inválido');
  }
  const [oeste, sul, este, norte] = partes;
  if (oeste < -180 || este > 180 || sul < -90 || norte > 90 ||
      oeste > este || sul > norte) {
    return utilitarios.erro(res, 400, 'pedido-invalido', 'bbox fora dos limites geográficos');
  }
  const dentro = [...estado.ocorrencias.values()]
    .filter((ocorrencia) => ocorrencia.estado !== 'resolvida')
    .filter((ocorrencia) =>
      ocorrencia.localizacao.lng >= oeste &&
      ocorrencia.localizacao.lng <= este &&
      ocorrencia.localizacao.lat >= sul &&
      ocorrencia.localizacao.lat <= norte)
    .map(estado.ocorrenciaPublica);
  res.set('Cache-Control', 'no-store');
  res.json(dentro);
});

router.post('/', (req, res) => {
  const cidadao = utilitarios.cidadaoValido(req, res);
  if (!cidadao) return;
  const chave = utilitarios.chaveValida(req, res);
  if (chave === false) return;
  if (!validarNovaOcorrencia(req.body)) {
    return utilitarios.erro(res, 400, 'pedido-invalido', 'Corpo da ocorrência inválido');
  }

  const corpoCanonico = utilitarios.canonico(req.body);
  if (chave) {
    const existente = estado.procurarIdempotencia(cidadao, chave);
    if (existente) {
      if (existente.corpo !== corpoCanonico) {
        return utilitarios.erro(res, 409, 'conflito-chave', 'A chave já foi usada com outro corpo');
      }
      res.set(existente.cabecalhos);
      res.set('Idempotent-Replayed', 'true');
      res.set('Cache-Control', 'no-store');
      return res.status(existente.estado).json(existente.resposta);
    }
  }

  const semelhantes = estado.procurarSemelhantes(
    req.body.categoria,
    req.body.localizacao,
    req.body.recusadas
  );
  let ocorrencia;
  let resultado;
  let statusResposta;
  const cabecalhos = { 'Cache-Control': 'no-store' };

  if (semelhantes.length === 0) {
    const id = estado.obterProximoId();
    ocorrencia = {
      id,
      categoria: req.body.categoria,
      descricao: req.body.descricao,
      localizacao: req.body.localizacao,
      temFotografia: Boolean(req.body.fotografia),
      estado: 'aberta',
      comunicacoes: 1,
      criadaEm: new Date().toISOString(),
      atualizadaEm: new Date().toISOString(),
      versao: 0,
      comunicantes: [cidadao]
    };
    if (req.body.fotografia) estado.fotografias.set(id, req.body.fotografia);
    estado.ocorrencias.set(id, ocorrencia);
    estado.actualizarVersao(ocorrencia);
    resultado = 'criada';
    statusResposta = 201;
    cabecalhos.Location = `/v1/ocorrencias/${id}`;
  } else {
    ocorrencia = semelhantes[0].ocorrencia;
    if (ocorrencia.comunicantes.includes(cidadao)) {
      resultado = 'ja-comunicada';
      statusResposta = 200;
    } else {
      ocorrencia.comunicacoes += 1;
      ocorrencia.comunicantes.push(cidadao);
      estado.actualizarVersao(ocorrencia);
      resultado = 'reforcada';
      statusResposta = 200;
    }
    cabecalhos.Location = `/v1/ocorrencias/${ocorrencia.id}`;
  }

  estado.guardarDados();
  const corpoResposta = {
    resultado,
    ocorrencia: estado.ocorrenciaPublica(ocorrencia)
  };
  if (chave) {
    estado.guardarIdempotencia(
      cidadao,
      chave,
      corpoCanonico,
      statusResposta,
      corpoResposta,
      cabecalhos
    );
  }
  estado.respostaPost(req, res, statusResposta, corpoResposta, cabecalhos);
});

router.post('/:id/reforcos', (req, res) => {
  const cidadao = utilitarios.cidadaoValido(req, res);
  if (!cidadao) return;
  const chave = utilitarios.chaveValida(req, res);
  if (chave === false) return;
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return utilitarios.erro(res, 400, 'pedido-invalido', 'Id da ocorrência inválido');
  }
  if (req.body && typeof req.body === 'object' &&
      req.body.comentario !== undefined &&
      (typeof req.body.comentario !== 'string' || req.body.comentario.length > 500)) {
    return utilitarios.erro(res, 400, 'pedido-invalido', 'Comentário inválido');
  }
  const corpoCanonico = utilitarios.canonico(req.body || {});
  if (chave) {
    const existente = estado.procurarIdempotencia(cidadao, chave);
    if (existente) {
      if (existente.corpo !== corpoCanonico) {
        return utilitarios.erro(res, 409, 'conflito-chave', 'A chave já foi usada com outro corpo');
      }
      res.set(existente.cabecalhos);
      res.set('Idempotent-Replayed', 'true');
      res.set('Cache-Control', 'no-store');
      return res.status(existente.estado).json(existente.resposta);
    }
  }
  const ocorrencia = estado.ocorrencias.get(id);
  if (!ocorrencia) {
    return utilitarios.erro(res, 404, 'nao-encontrada', 'Ocorrência não encontrada');
  }
  if (ocorrencia.estado === 'resolvida') {
    return utilitarios.erro(res, 410, 'resolvida', 'A ocorrência está resolvida e já não aceita reforços');
  }

  let resultado;
  let statusResposta;
  if (ocorrencia.comunicantes.includes(cidadao)) {
    resultado = 'ja-comunicada';
    statusResposta = 200;
  } else {
    ocorrencia.comunicacoes += 1;
    ocorrencia.comunicantes.push(cidadao);
    estado.actualizarVersao(ocorrencia);
    resultado = 'reforcada';
    statusResposta = 201;
  }
  estado.guardarDados();
  const corpoResposta = {
    resultado,
    ocorrencia: estado.ocorrenciaPublica(ocorrencia)
  };
  const cabecalhos = { 'Cache-Control': 'no-store' };
  if (chave) {
    estado.guardarIdempotencia(
      cidadao,
      chave,
      corpoCanonico,
      statusResposta,
      corpoResposta,
      cabecalhos
    );
  }
  estado.respostaPost(req, res, statusResposta, corpoResposta, cabecalhos);
});

router.get('/:id/fotografia', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return utilitarios.erro(res, 400, 'pedido-invalido', 'Id da ocorrência inválido');
  }
  const fotografia = estado.fotografias.get(id);
  if (!fotografia) {
    return utilitarios.erro(res, 404, 'nao-encontrada', 'Fotografia não encontrada');
  }
  const correspondencia = /^data:image\/jpeg;base64,(.*)$/.exec(fotografia);
  res.set('Cache-Control', 'no-store');
  res.type('image/jpeg');
  res.send(Buffer.from(correspondencia[1], 'base64'));
});

module.exports = router;
