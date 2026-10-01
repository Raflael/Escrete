// Acesso à API da Wikipédia com cache em disco: cada página baixada uma vez só.
import fs from "node:fs";
import path from "node:path";

const RAIZ = path.resolve(import.meta.dirname, "..");
const CACHE = path.join(RAIZ, "dados/brutos/wiki");
const UA = "CopasProjeto/0.1 (projeto pessoal de estudo, sem fins comerciais)";

const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const nomeCache = (titulo) => titulo.replace(/[^\p{L}\p{N}_-]+/gu, "_") + ".json";

export async function api(params) {
  const url = "https://en.wikipedia.org/w/api.php?" + new URLSearchParams({ format: "json", formatversion: "2", ...params });
  for (let tentativa = 1; ; tentativa++) {
    let erro;
    try {
      const r = await fetch(url, { headers: { "User-Agent": UA } });
      const corpo = await r.text();
      // Limite de requisições às vezes chega como 200 com texto puro: trata como falha e espera.
      if (r.ok && corpo.startsWith("{")) return JSON.parse(corpo);
      erro = new Error(`HTTP ${r.status} em ${url}: ${corpo.slice(0, 80)}`);
    } catch (e) {
      erro = e; // queda de rede / timeout: tenta de novo
    }
    if (tentativa >= 6) throw erro;
    await espera(3000 * tentativa);
  }
}

// Wikitext de uma página, seguindo redirecionamentos.
export async function wikitext(titulo) {
  fs.mkdirSync(CACHE, { recursive: true });
  const arq = path.join(CACHE, nomeCache(titulo));
  if (fs.existsSync(arq)) return JSON.parse(fs.readFileSync(arq, "utf8")).wikitext;
  const j = await api({ action: "parse", page: titulo, prop: "wikitext", redirects: "1" });
  if (j.error) throw new Error(`${titulo}: ${j.error.info}`);
  fs.writeFileSync(arq, JSON.stringify({ titulo, wikitext: j.parse.wikitext }));
  await espera(300);
  return j.parse.wikitext;
}

// Wikitext de muitas páginas de uma vez (50 por requisição), para as fichas dos jogadores.
// Devolve Map titulo-pedido -> wikitext (ou null se a página não existe).
export async function variosWikitexts(titulos, pasta = "jogadores") {
  const dir = path.join(CACHE, pasta);
  fs.mkdirSync(dir, { recursive: true });
  const saida = new Map();
  const faltam = [];
  for (const t of titulos) {
    const arq = path.join(dir, nomeCache(t));
    if (fs.existsSync(arq)) saida.set(t, JSON.parse(fs.readFileSync(arq, "utf8")).wikitext);
    else faltam.push(t);
  }
  for (let i = 0; i < faltam.length; i += 50) {
    const lote = faltam.slice(i, i + 50);
    const j = await api({
      action: "query", prop: "revisions", rvprop: "content", rvslots: "main",
      redirects: "1", titles: lote.join("|"),
    });
    // mapeia título pedido -> título final (normalização + redirecionamento)
    const destino = new Map(lote.map((t) => [t, t]));
    for (const n of j.query.normalized ?? []) for (const [k, v] of destino) if (v === n.from) destino.set(k, n.to);
    for (const r of j.query.redirects ?? []) for (const [k, v] of destino) if (v === r.from) destino.set(k, r.to);
    const porTitulo = new Map(j.query.pages.map((p) => [p.title, p.missing ? null : p.revisions?.[0]?.slots?.main?.content ?? null]));
    for (const t of lote) {
      const texto = porTitulo.get(destino.get(t)) ?? null;
      fs.writeFileSync(path.join(dir, nomeCache(t)), JSON.stringify({ titulo: t, final: destino.get(t), wikitext: texto }));
      saida.set(t, texto);
    }
    process.stdout.write(`\r  fichas: ${Math.min(i + 50, faltam.length)}/${faltam.length}   `);
    await espera(400);
  }
  if (faltam.length) process.stdout.write("\n");
  return saida;
}
