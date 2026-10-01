// Service worker: guarda o jogo para funcionar offline e busca a versão nova em segundo plano.
// Trocar VERSAO a cada publicação faz os navegadores baixarem tudo de novo e avisarem o jogador.
const VERSAO = "2026-10-01-1";
const CACHE = `escrete-${VERSAO}`;
const ARQUIVOS = [
  "./", "index.html", "manifest.webmanifest", "src/estilo.css", "fontes/fontes.css",
  "fontes/AbrilFatface-400-latin.woff2", "fontes/AbrilFatface-400-latin-ext.woff2",
  "fontes/BarlowCondensed-500-latin.woff2", "fontes/BarlowCondensed-500-latin-ext.woff2",
  "fontes/BarlowCondensed-600-latin.woff2", "fontes/BarlowCondensed-600-latin-ext.woff2",
  "fontes/BarlowCondensed-700-latin.woff2", "fontes/BarlowCondensed-700-latin-ext.woff2",
  "fontes/SourceSerif4-400-latin.woff2", "fontes/SourceSerif4-400-latin-ext.woff2",
  "fontes/SourceSerif4-400i-latin.woff2", "fontes/SourceSerif4-400i-latin-ext.woff2",
  "fontes/SourceSerif4-600-latin.woff2", "fontes/SourceSerif4-600-latin-ext.woff2",
  "icones/icone.svg", "icones/icone-192.png",
  "src/app.js",
  "src/motor/rng.js", "src/motor/formacoes.js", "src/motor/time.js", "src/motor/partida.js", "src/motor/copa.js",
  "src/motor/draft.js", "src/motor/orcamento.js",
  "src/ui/util.js", "src/ui/passagem.js", "src/ui/campo.js", "src/ui/capa.js", "src/ui/draft-tela.js", "src/ui/livre-tela.js",
  "src/ui/copa-tela.js", "src/ui/historico.js", "src/ui/como-jogar.js", "src/ui/atualizacao.js",
  "dados/jogo/elencos.json",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARQUIVOS)));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith("escrete-") && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener("message", (e) => { if (e.data === "assumir") self.skipWaiting(); });

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then((r) => r ?? fetch(e.request)));
});
