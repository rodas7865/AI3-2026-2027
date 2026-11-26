const fs = require('node:fs');
const path = require('node:path');
const { distanciaEmMetros } = require('./geo');

const dadosDir = path.join(__dirname, 'dados');
const dadosFicheiro = path.join(dadosDir, 'ocorrencias.json');

const categorias = [
  { id: 'buraco', nome: 'Buraco', raio: 15 },
  { id: 'semaforo', nome: 'Semáforo', raio: 25 },
  { id: 'iluminacao', nome: 'Iluminação', raio: 30 },
  { id: 'sinalizacao', nome: 'Sinalização', raio: 20 },
  { id: 'outro', nome: 'Outro', raio: 25 }
];
const estados = new Set(['aberta', 'em-resolucao', 'resolvida']);
const categoriasIds = new Set(categorias.map((categoria) => categoria.id));
const ocorrencias = new Map();
const fotografias = new Map();
const idempotencias = new Map();

let versao = 0;
let proximoId = 1;
let perdaJaSimulada = false;

function carregarDados() {
  if (!fs.existsSync(dadosFicheiro)) return;
  try {
    const dados = JSON.parse(fs.readFileSync(dadosFicheiro, 'utf8'));
    versao = Number.isInteger(dados.versao) ? dados.versao : 0;
    proximoId = Number.isInteger(dados.proximoId) ? dados.proximoId : 1;
    for (const ocorrencia of dados.ocorrencias || []) {
      ocorrencias.set(ocorrencia.id, ocorrencia);
      if (ocorrencia.fotografia) fotografias.set(ocorrencia.id, ocorrencia.fotografia);
    }
    for (const item of dados.idempotencias || []) {
      if (item.expiraEm > Date.now()) {
        idempotencias.set(item.cidadao + ':' + item.chave, item);
      }
    }
  } catch (err) {
    console.error('Não foi possível carregar dados:', err.message);
  }
}

function guardarDados() {
  fs.mkdirSync(dadosDir, { recursive: true });
  fs.writeFileSync(dadosFicheiro, JSON.stringify({
    versao,
    proximoId,
    ocorrencias: [...ocorrencias.values()].map((ocorrencia) => ({
      ...ocorrencia,
      fotografia: fotografias.get(ocorrencia.id)
    })),
    idempotencias: [...idempotencias.values()]
  }, null, 2));
}

function ocorrenciaPublica(ocorrencia) {
  const { comunicantes, fotografia, ...publica } = ocorrencia;
  return { ...publica, temFotografia: fotografias.has(ocorrencia.id) };
}

function actualizarVersao(ocorrencia) {
  versao += 1;
  ocorrencia.versao = versao;
  ocorrencia.atualizadaEm = new Date().toISOString();
}

function procurarSemelhantes(categoria, localizacao, excluir = []) {
  const categoriaDefinida = categorias.find((item) => item.id === categoria);
  if (!categoriaDefinida) return [];
  const excluidos = new Set(Array.isArray(excluir) ? excluir : []);
  return [...ocorrencias.values()]
    .filter((ocorrencia) =>
      ocorrencia.categoria === categoria &&
      ocorrencia.estado !== 'resolvida' &&
      !excluidos.has(ocorrencia.id))
    .map((ocorrencia) => ({
      ocorrencia,
      distancia: distanciaEmMetros(localizacao, ocorrencia.localizacao)
    }))
    .filter((candidata) => candidata.distancia <= categoriaDefinida.raio)
    .sort((a, b) => a.distancia - b.distancia);
}

function procurarIdempotencia(cidadao, chave) {
  const entrada = idempotencias.get(cidadao + ':' + chave);
  if (!entrada) return null;
  if (entrada.expiraEm <= Date.now()) {
    idempotencias.delete(cidadao + ':' + chave);
    return null;
  }
  return entrada;
}

function guardarIdempotencia(cidadao, chave, corpo, status, resposta, cabecalhos = {}) {
  if (!chave) return;
  idempotencias.set(cidadao + ':' + chave, {
    cidadao,
    chave,
    corpo,
    estado: status,
    resposta,
    cabecalhos,
    expiraEm: Date.now() + 24 * 60 * 60 * 1000
  });
  guardarDados();
}

function respostaPost(req, res, status, corpo, cabecalhos = {}) {
  res.set(cabecalhos);
  if (process.env.SIMULAR_PERDA_RESPOSTA === '1' && !perdaJaSimulada) {
    perdaJaSimulada = true;
    if (res.socket) res.socket.destroy();
    return;
  }
  res.status(status).json(corpo);
}

function obterVersao() {
  return versao;
}

function obterProximoId() {
  return proximoId++;
}

module.exports = {
  categorias,
  estados,
  categoriasIds,
  ocorrencias,
  fotografias,
  carregarDados,
  guardarDados,
  ocorrenciaPublica,
  actualizarVersao,
  procurarSemelhantes,
  procurarIdempotencia,
  guardarIdempotencia,
  respostaPost,
  obterVersao,
  obterProximoId
};
