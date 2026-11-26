const path = require('node:path');
const express = require('express');
const categoriasRouter = require('./routes/categorias');
const ocorrenciasRouter = require('./routes/ocorrencias');
const administracaoRouter = require('./routes/administracao');
const estado = require('./estado');
const utilitarios = require('./utilitarios');

const app = express();
const PORT = process.env.PORT || 3000;

estado.carregarDados();

app.use(express.json({ limit: '1mb' }));

let falhas503Restantes = Number(process.env.SIMULAR_503 || 0);
if (!Number.isInteger(falhas503Restantes) || falhas503Restantes < 0) falhas503Restantes = 0;
app.use('/v1', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  if (falhas503Restantes > 0) {
    falhas503Restantes -= 1;
    res.set('Retry-After', '2');
    return utilitarios.erro(res, 503, 'indisponivel', 'Serviço temporariamente indisponível');
  }
  next();
});

app.use(express.static(path.join(__dirname, 'public')));

app.get('/swagger', (req, res) => {
  res.redirect('/swagger.html');
});

app.get('/openapi/reporta.openapi.yaml', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.type('application/yaml');
  res.sendFile(path.join(__dirname, '..', 'reporta.openapi.yaml'));
});

app.use('/v1/categorias', categoriasRouter);
app.use('/v1/ocorrencias', ocorrenciasRouter);
app.use('/v1/admin/ocorrencias', administracaoRouter);

app.use((req, res) => {
  utilitarios.erro(res, 404, 'nao-encontrado', 'Rota inexistente');
});

app.use((err, req, res, next) => {
  const status = err.status || 500;
  utilitarios.erro(
    res,
    status,
    status === 400 ? 'pedido-invalido' : 'erro-interno',
    err.message
  );
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Reporta a ouvir em http://localhost:${PORT}`);
  });
}

module.exports = {
  app,
  procurarSemelhantes: estado.procurarSemelhantes,
  ocorrencias: estado.ocorrencias,
  categorias: estado.categorias
};
