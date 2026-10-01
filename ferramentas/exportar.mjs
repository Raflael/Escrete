// Passo final dos dados: fatos + nota-base + avaliações individuais -> dados/jogo/elencos.json
//
// Avaliações individuais ficam em dados/notas/<ano>.txt, no formato:
//   @BRA                      (seleção: código ou nome da Wikipédia; vale até o próximo @)
//   Pelé = 99 L               (nota; L = lenda)
//   Tostão = 90 | CA MEI      (depois da barra: posições, substituindo as calculadas)
//   @HUN +3                   (ajuste de seleção: soma à nota-base de quem não tem avaliação individual)
//   # comentário
import fs from "node:fs";
import path from "node:path";
import { notaBase } from "./nota-base.mjs";
import { SELECOES } from "./selecoes.mjs";

const RAIZ = path.resolve(import.meta.dirname, "..");
const fatos = JSON.parse(fs.readFileSync(path.join(RAIZ, "dados/elencos/fatos.json"), "utf8"));
const POS_VALIDAS = new Set(["GOL", "LD", "ZAG", "LE", "VOL", "MC", "MD", "ME", "MEI", "PD", "PE", "CA"]);

const semAcento = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");
const slug = (s) => semAcento(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
// Um código pode valer para mais de um nome (YUG: Iugoslávia e RF Iugoslávia) — vale o que jogou naquele ano.
const selecoesPorAno = new Set(fatos.map((f) => `${f.ano}|${f.selecao}`));
const selecaoDoCodigo = (cod, ano) => {
  const nomes = Object.entries(SELECOES).filter(([, s]) => s.cod === cod).map(([en]) => en);
  return nomes.find((en) => selecoesPorAno.has(`${ano}|${en}`)) ?? nomes[0];
};

// ---------- avaliações individuais ----------
const avaliacoes = new Map(); // "ano|Selecao|nome normalizado" -> { f, l, pos }
const ajustes = new Map();    // "ano|Selecao" -> pontos somados à nota-base
const problemas = [];
const DIR_NOTAS = path.join(RAIZ, "dados/notas");
fs.mkdirSync(DIR_NOTAS, { recursive: true });
for (const arq of fs.readdirSync(DIR_NOTAS).filter((a) => /^\d{4}\.txt$/.test(a))) {
  const ano = +arq.slice(0, 4);
  let sel = null;
  fs.readFileSync(path.join(DIR_NOTAS, arq), "utf8").split(/\r?\n/).forEach((bruta, i) => {
    const linha = bruta.replace(/#.*/, "").trim();
    if (!linha) return;
    if (linha.startsWith("@")) {
      const [s, aj] = linha.slice(1).trim().split(/\s+/);
      sel = selecaoDoCodigo(s, ano) ?? (SELECOES[s] ? s : null);
      if (!sel) problemas.push(`${arq}:${i + 1} seleção desconhecida "${s}"`);
      else if (aj) ajustes.set(`${ano}|${sel}`, +aj);
      return;
    }
    const m = /^(.+?)\s*=\s*(\d{2})\s*(L)?\s*(?:\|\s*(.+))?$/.exec(linha);
    if (!m || !sel) { problemas.push(`${arq}:${i + 1} linha inválida: ${linha}`); return; }
    const pos = m[4] ? m[4].split(/\s+/).map((p) => p.toUpperCase()) : null;
    if (pos?.some((p) => !POS_VALIDAS.has(p))) problemas.push(`${arq}:${i + 1} posição inválida: ${m[4]}`);
    avaliacoes.set(`${ano}|${sel}|${semAcento(m[1]).toLowerCase()}`, { f: +m[2], l: !!m[3], pos, usada: false, onde: `${arq}:${i + 1}` });
  });
}

// ---------- montagem ----------
const elencos = new Map();
for (const f of fatos) {
  const meta = SELECOES[f.selecao];
  if (!meta) { problemas.push(`seleção sem cadastro: ${f.selecao}`); continue; }
  const idElenco = `${f.ano}-${meta.cod}`;
  if (!elencos.has(idElenco)) elencos.set(idElenco, { id: idElenco, ano: f.ano, sel: meta.cod, camp: f.campanha, js: [] });
  const chaves = [f.nome, f.wiki].filter(Boolean).map((n) => `${f.ano}|${f.selecao}|${semAcento(n).toLowerCase()}`);
  const av = chaves.map((k) => avaliacoes.get(k)).find(Boolean);
  if (av) av.usada = true;
  const j = {
    id: slug(f.wiki ?? `${f.nome}-${meta.cod}`),
    n: f.nome,
    no: f.no,
    pos: av?.pos ?? f.pos,
    f: av?.f ?? Math.max(50, Math.min(92, notaBase(f) + (ajustes.get(`${f.ano}|${f.selecao}`) ?? 0))),
    j: f.jogos,
    g: f.gols,
  };
  if (av?.l) j.l = 1;
  if (!av) j.b = 1; // nota ainda só da camada automática — a revisão manual procura por isso
  elencos.get(idElenco).js.push(j);
}
for (const [k, av] of avaliacoes) if (!av.usada) problemas.push(`${av.onde} não casou com nenhum convocado: ${k}`);

// Ordem de exibição: goleiros, defesa, meio, ataque; dentro, pela nota.
const ORDEM = { GOL: 0, LD: 1, ZAG: 2, LE: 3, VOL: 4, MC: 5, MD: 6, ME: 7, MEI: 8, PD: 9, PE: 10, CA: 11 };
for (const e of elencos.values()) e.js.sort((a, b) => ORDEM[a.pos[0]] - ORDEM[b.pos[0]] || b.f - a.f);

const selecoes = {};
for (const [en, s] of Object.entries(SELECOES)) {
  if (![...elencos.values()].some((e) => e.sel === s.cod)) continue;
  selecoes[s.cod] = { nome: s.nome, cores: s.cores, linhagem: s.linhagem ?? s.cod, ...(s.extinta ? { extinta: 1 } : {}) };
}
const saida = { versao: new Date().toISOString().slice(0, 10), selecoes, elencos: [...elencos.values()] };
fs.mkdirSync(path.join(RAIZ, "dados/jogo"), { recursive: true });
const arqSaida = path.join(RAIZ, "dados/jogo/elencos.json");
fs.writeFileSync(arqSaida, JSON.stringify(saida));

const nAval = [...avaliacoes.values()].filter((a) => a.usada).length;
const nJog = saida.elencos.reduce((s, e) => s + e.js.length, 0);
console.log(`${saida.elencos.length} elencos, ${nJog} jogadores, ${nAval} com avaliação individual, ${(fs.statSync(arqSaida).size / 1024).toFixed(0)} KB`);
if (problemas.length) console.log("PROBLEMAS:\n  " + problemas.join("\n  "));
