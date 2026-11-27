// Service worker provisório: ainda sem estratégia de cache
self.addEventListener('install', () => {
  console.log('[sw] install');
  self.skipWaiting();
});

self.addEventListener('activate', (evento) => {
  console.log('[sw] activate');
  evento.waitUntil(self.clients.claim());
});
