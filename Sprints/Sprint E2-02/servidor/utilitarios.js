const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function erro(res, status, codigo, mensagem) {
  res.status(status).json({ codigo, mensagem });
}

function cidadaoValido(req, res) {
  const cidadao = req.get('X-Cidadao');
  if (!uuidRegex.test(cidadao || '')) {
    erro(res, 401, 'nao-identificado', 'Cabeçalho X-Cidadao em falta ou inválido');
    return null;
  }
  return cidadao;
}

function chaveValida(req, res) {
  const chave = req.get('Idempotency-Key');
  if (chave === undefined) return null;
  if (!uuidRegex.test(chave)) {
    erro(res, 400, 'pedido-invalido', 'Idempotency-Key tem de ser um UUID');
    return false;
  }
  return chave;
}

function canonico(valor) {
  if (Array.isArray(valor)) return `[${valor.map(canonico).join(',')}]`;
  if (valor && typeof valor === 'object') {
    return `{${Object.keys(valor).sort().map((chave) => `${JSON.stringify(chave)}:${canonico(valor[chave])}`).join(',')}}`;
  }
  return JSON.stringify(valor);
}

function validarLocalizacao(localizacao) {
  return localizacao &&
    typeof localizacao.lat === 'number' &&
    typeof localizacao.lng === 'number' &&
    Number.isFinite(localizacao.lat) &&
    Number.isFinite(localizacao.lng) &&
    localizacao.lat >= -90 && localizacao.lat <= 90 &&
    localizacao.lng >= -180 && localizacao.lng <= 180 &&
    (localizacao.precisao === undefined ||
      (typeof localizacao.precisao === 'number' &&
       Number.isFinite(localizacao.precisao) &&
       localizacao.precisao >= 0));
}

function validarFotografia(fotografia) {
  if (fotografia === undefined) return true;
  if (typeof fotografia !== 'string') return false;
  const correspondencia = /^data:image\/jpeg;base64,([A-Za-z0-9+/]*={0,2})$/.exec(fotografia);
  if (!correspondencia) return false;
  const bytes = Buffer.from(correspondencia[1], 'base64');
  return bytes.length <= 300 * 1024;
}

module.exports = {
  erro,
  cidadaoValido,
  chaveValida,
  canonico,
  validarLocalizacao,
  validarFotografia
};
