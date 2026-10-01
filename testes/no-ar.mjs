// Confere um site publicado: carrega, lê os dados, sem erros, e o service worker assume.
// uso: node testes/no-ar.mjs <url> <seletor-que-prova-que-carregou>
import { abrirNavegador } from "./navegador.mjs";
const [url, seletor] = process.argv.slice(2);
const nav = await abrirNavegador({ largura: 1280, altura: 900, porta: 9342 });
try {
  await nav.ir(url);
  await nav.esperarAte(`!!document.querySelector(${JSON.stringify(seletor)})`, 20000);
  console.log("título:", await nav.js("document.title"));
  console.log("prévia do link:", await nav.js("document.querySelector('meta[property=\"og:image\"]')?.content"));
  await nav.espera(3000);
  await nav.ir(url);
  await nav.espera(2500);
  console.log("app offline ativo:", await nav.js("!!navigator.serviceWorker.controller"));
  const og = await nav.js("fetch(document.querySelector('meta[property=\"og:image\"]').content).then(r => r.status + ' ' + r.headers.get('content-type'))");
  console.log("imagem da prévia:", og);
} catch (e) {
  console.log("FALHOU:", e.message);
} finally {
  console.log(nav.erros.length ? "erros: " + nav.erros.join(" | ") : "sem erros no console");
  nav.fechar();
}
