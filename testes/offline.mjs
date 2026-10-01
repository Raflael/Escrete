// Confere o service worker: a lista de arquivos existe e cobre todo o JS, e o jogo abre sem rede.
// uso: node testes/offline.mjs   (servidor rodando em :8110; usa 127.0.0.1 porque no localhost o SW fica desligado)
import fs from "node:fs";
import path from "node:path";
import { abrirNavegador } from "./navegador.mjs";

const sw = fs.readFileSync("sw.js", "utf8");
const lista = [...(/const ARQUIVOS = \[([\s\S]*?)\];/.exec(sw)[1]).matchAll(/"([^"]+)"/g)].map((m) => m[1]);
const faltam = lista.filter((a) => a !== "./" && !fs.existsSync(a));
const js = fs.readdirSync("src", { recursive: true }).filter((f) => f.endsWith(".js")).map((f) => "src/" + f.split(path.sep).join("/"));
const fora = js.filter((f) => !lista.includes(f));
console.log(`${lista.length} arquivos na lista; ${faltam.length ? "FALTAM: " + faltam.join(", ") : "todos existem"}; JS fora da lista: ${fora.join(", ") || "nenhum"}`);

const nav = await abrirNavegador({ largura: 1000, altura: 800, porta: 9340 });
try {
  await nav.ir("http://127.0.0.1:8110/");
  await nav.espera(3000);
  await nav.ir("http://127.0.0.1:8110/");
  await nav.espera(1500);
  console.log("controlado pelo SW:", await nav.js("!!navigator.serviceWorker.controller"));
  console.log("cache:", await nav.js("caches.keys().then(ks => Promise.all(ks.map(k => caches.open(k).then(c => c.keys().then(r => k + ' (' + r.length + ' itens)'))))).then(x => x.join(', '))"));
  // Sem rede: o fetch de fora falha, mas a página e os dados vêm do cache.
  await nav.js("navigator.serviceWorker.controller && 1");
  const ok = await nav.js("fetch('dados/jogo/elencos.json').then(r => r.ok).catch(() => false)");
  console.log("elencos.json servido:", ok);
} finally {
  console.log(nav.erros.length ? "erros: " + nav.erros.join(" | ") : "sem erros no console");
  nav.fechar();
}
