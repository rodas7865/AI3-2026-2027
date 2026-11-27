// Ponto de entrada da página
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registo = await navigator.serviceWorker.register('/sw.js');
      console.log('Service worker registado:', registo.scope);
    } catch (erro) {
      console.error('Falha ao registar o service worker:', erro);
    }
  });
}
