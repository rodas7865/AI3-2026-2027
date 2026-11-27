const express = require('express');
const estado = require('../estado');
const utilitarios = require('../utilitarios');

const router = express.Router();
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'mudar-isto';

router.patch('/:id', (req, res) => {
  if (req.get('X-Admin-Token') !== ADMIN_TOKEN) {
    return utilitarios.erro(res, 403, 'token-invalido', 'X-Admin-Token em falta ou inválido');
  }
  const id = req.params.id;
  if (!utilitarios.uuidValido(id)) {
    return utilitarios.erro(res, 400, 'pedido-invalido', 'Id da ocorrência inválido');
  }
  if (!req.body || !estado.estados.has(req.body.estado)) {
    return utilitarios.erro(res, 400, 'pedido-invalido', 'Estado inválido');
  }
  const ocorrencia = estado.ocorrencias.get(id);
  if (!ocorrencia) {
    return utilitarios.erro(res, 404, 'nao-encontrada', 'Ocorrência não encontrada');
  }
  if (ocorrencia.estado !== req.body.estado) {
    ocorrencia.estado = req.body.estado;
    estado.actualizarVersao(ocorrencia);
    estado.guardarDados();
  }
  res.set('Cache-Control', 'no-store');
  res.json(estado.ocorrenciaPublica(ocorrencia));
});

module.exports = router;
