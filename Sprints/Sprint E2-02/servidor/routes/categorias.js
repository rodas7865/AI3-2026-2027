const express = require('express');
const estado = require('../estado');

const router = express.Router();

router.get('/', (req, res) => {
  res.set('Cache-Control', 'public, max-age=3600');
  res.json(estado.categorias);
});

module.exports = router;
