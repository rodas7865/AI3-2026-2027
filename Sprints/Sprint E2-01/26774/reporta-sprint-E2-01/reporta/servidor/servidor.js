const path = require('node:path');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '1mb' }));

// Serve a PWA
app.use(express.static(path.join(__dirname, 'public')));

// Resposta provisória das rotas /v1 (sprint E2-01)
function naoImplementado(req, res) {
  res.status(501).json({
    codigo: 'nao-implementado',
    mensagem: `${req.method} ${req.originalUrl} ainda não está implementada`
  });
}

app.get('/v1/categorias', naoImplementado);
app.get('/v1/ocorrencias/semelhantes', naoImplementado);
app.get('/v1/ocorrencias/alteracoes', naoImplementado);
app.get('/v1/ocorrencias/:id/fotografia', naoImplementado);
app.get('/v1/ocorrencias', naoImplementado);
app.post('/v1/ocorrencias', naoImplementado);
app.post('/v1/ocorrencias/:id/reforcos', naoImplementado);
app.patch('/v1/admin/ocorrencias/:id', naoImplementado);

// Rota inexistente
app.use((req, res) => {
  res.status(404).json({ codigo: 'nao-encontrado', mensagem: 'Rota inexistente' });
});

// Erros (por exemplo, JSON mal formado)
app.use((err, req, res, next) => {
  const estado = err.status || 500;
  res.status(estado).json({
    codigo: estado === 400 ? 'pedido-invalido' : 'erro-interno',
    mensagem: err.message
  });
});

app.listen(PORT, () => {
  console.log(`Reporta a ouvir em http://localhost:${PORT}`);
});
