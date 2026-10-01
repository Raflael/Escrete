// Passo 4 dos dados: junta convocados + fichas + partidas numa tabela de fatos por jogador e Copa.
// Saída: dados/elencos/fatos.json — nada de nota ainda, só o que aconteceu.
import fs from "node:fs";
import path from "node:path";
import { api } from "./wiki.mjs";
import { templates, limpo } from "./wikitexto.mjs";

const RAIZ = path.resolve(import.meta.dirname, "..");
const ler = (p) => JSON.parse(fs.readFileSync(path.join(RAIZ, p), "utf8"));
const convocados = ler("dados/elencos/convocados.json");
const partidas = ler("dados/elencos/partidas.json");
const DIR_FICHAS = path.join(RAIZ, "dados/brutos/wiki/jogadores");
const nomeCache = (t) => t.replace(/[^\p{L}\p{N}_-]+/gu, "_") + ".json";

// ---------- 1. Títulos canônicos (redirecionamentos) ----------
const ARQ_REDIR = path.join(RAIZ, "dados/brutos/wiki/_redirecionamentos.json");
const canon = fs.existsSync(ARQ_REDIR) ? ler("dados/brutos/wiki/_redirecionamentos.json") : {};
const ficha = new Map(); // título canônico -> wikitext
for (const c of convocados) {
  if (!c.wiki) continue;
  const arq = path.join(DIR_FICHAS, nomeCache(c.wiki));
  if (!fs.existsSync(arq)) continue;
  const f = JSON.parse(fs.readFileSync(arq, "utf8"));
  canon[c.wiki] = f.final ?? c.wiki;
  if (f.wikitext) ficha.set(canon[c.wiki], f.wikitext);
}
const primeiraLetra = (t) => t.charAt(0).toUpperCase() + t.slice(1);
const linksPartidas = new Set();
for (const p of partidas) {
  for (const t of p.escalacoes) for (const j of t) linksPartidas.add(j.wiki);
  for (const g of [...p.caixa.gols1, ...p.caixa.gols2]) linksPartidas.add(g.wiki);
}
const faltam = [...linksPartidas].filter((t) => !(t in canon));
console.log(`links de partidas sem título canônico: ${faltam.length}`);
for (let i = 0; i < faltam.length; i += 50) {
  const lote = faltam.slice(i, i + 50);
  const j = await api({ action: "query", redirects: "1", titles: lote.join("|") });
  const dest = new Map(lote.map((t) => [t, t]));
  for (const n of j.query.normalized ?? []) for (const [k, v] of dest) if (v === n.from) dest.set(k, n.to);
  for (const r of j.query.redirects ?? []) for (const [k, v] of dest) if (v === r.from) dest.set(k, r.to);
  for (const t of lote) canon[t] = dest.get(t);
  process.stdout.write(`\r  resolvidos ${Math.min(i + 50, faltam.length)}/${faltam.length}  `);
}
if (faltam.length) process.stdout.write("\n");
fs.writeFileSync(ARQ_REDIR, JSON.stringify(canon));
const C = (t) => (t ? canon[t] ?? primeiraLetra(t) : null);

// ---------- 2. Posição: códigos das escalações -> nossas posições ----------
function posDoCodigo(cod, ano) {
  const antigo = ano <= 1966; // no WM, "RB/LB" eram os zagueiros de lado, não laterais que apoiam
  const m = {
    GK: ["GOL"], RB: antigo ? ["ZAG", "LD"] : ["LD"], LB: antigo ? ["ZAG", "LE"] : ["LE"],
    RWB: ["LD"], LWB: ["LE"], CB: ["ZAG"], SW: ["ZAG"], CH: ["ZAG"], FB: ["ZAG"],
    DM: ["VOL"], RH: ["VOL"], LH: ["VOL"], HB: ["VOL"], WH: ["VOL"], CM: ["MC"],
    RM: ["MD"], LM: ["ME"], AM: ["MEI"], IR: ["MEI"], IL: ["MEI"], IF: ["MEI"],
    RW: ["PD"], OR: ["PD"], LW: ["PE"], OL: ["PE"], CF: ["CA"], ST: ["CA"], SS: ["CA", "MEI"],
  };
  return m[cod] ?? null; // DF, MF, FW genéricos: decididos depois
}

// Posição por extenso da ficha da Wikipédia.
function posDaFicha(texto) {
  if (!texto) return [];
  const ib = templates(texto, /^infobox football biography/i)[0];
  const bruto = (ib?.params.position ?? "").toLowerCase();
  const s = limpo(bruto).toLowerCase();
  const achadas = [];
  const add = (...ps) => ps.forEach((p) => !achadas.includes(p) && achadas.push(p));
  if (/goalkeeper/.test(s)) add("GOL");
  if (/right[- ]?(back|full|wing[- ]?back)/.test(s)) add("LD");
  if (/left[- ]?(back|full|wing[- ]?back)/.test(s)) add("LE");
  if (/cent(re|er)[- ]?(back|half)|sweeper|libero|central defender|stopper/.test(s)) add("ZAG");
  if (/defensive midfield|holding|wing[- ]?half|half[- ]?back|right[- ]half|left[- ]half/.test(s)) add("VOL");
  if (/cent(ral|re|er) midfield|box-to-box/.test(s)) add("MC");
  if (/attacking midfield|playmaker|inside (forward|left|right)|offensive midfield|second striker/.test(s)) add("MEI");
  if (/right (midfield|winger|wing)|outside right|right-winger/.test(s)) add("PD");
  if (/left (midfield|winger|wing)|outside left|left-winger/.test(s)) add("PE");
  if (/(^|[^-])winger/.test(s) && !achadas.includes("PD") && !achadas.includes("PE")) add("PD", "PE");
  if (/striker|centre[- ]forward|center[- ]forward|forward/.test(s)) add("CA");
  if (/full[- ]?back/.test(s) && !achadas.includes("LD") && !achadas.includes("LE")) add("LD", "LE");
  if (/defender/.test(s) && !achadas.some((p) => ["LD", "LE", "ZAG"].includes(p))) add("ZAG");
  if (/midfielder/.test(s) && !achadas.some((p) => ["VOL", "MC", "MEI", "MD", "ME"].includes(p))) add("MC");
  return achadas;
}

// Carreira pela seleção (total, na ficha): mede o tamanho do jogador além daquela Copa.
function carreira(texto) {
  if (!texto) return {};
  const ib = templates(texto, /^infobox football biography/i)[0];
  if (!ib) return {};
  let caps = 0, gols = 0;
  for (const [k, v] of Object.entries(ib.params)) {
    if (/^nationalcaps\d+$/.test(k)) caps = Math.max(caps, +limpo(v).replace(/\D/g, "") || 0);
    if (/^nationalgoals\d+$/.test(k)) gols = Math.max(gols, +limpo(v).replace(/\D/g, "") || 0);
  }
  return { capsCarreira: caps || null, golsCarreira: gols || null };
}

// ---------- 3. Estatística por jogador e Copa ----------
const chave = (ano, wiki) => `${ano}|${wiki}`;
const stats = new Map();
const st = (ano, wiki) => {
  const k = chave(ano, wiki);
  if (!stats.has(k)) stats.set(k, { jogos: 0, titular: 0, minutos: 0, gols: 0, codigos: {} });
  return stats.get(k);
};
for (const p of partidas) {
  for (const tab of p.escalacoes)
    for (const j of tab) {
      const s = st(p.ano, C(j.wiki));
      s.jogos++;
      if (j.titular) s.titular++;
      s.minutos += Math.max(0, Math.min(120, j.min));
      s.codigos[j.pos] = (s.codigos[j.pos] ?? 0) + 1;
    }
  for (const g of [...p.caixa.gols1, ...p.caixa.gols2]) st(p.ano, C(g.wiki)).gols++;
}

// ---------- 4. Campanha de cada seleção ----------
// Cada escalação é atribuída à seleção da maioria dos seus jogadores (pelo cadastro de convocados).
const selDe = new Map(convocados.filter((c) => c.wiki).map((c) => [chave(c.ano, C(c.wiki)), c.selecao]));
const campanha = new Map();
const cp = (ano, sel) => {
  const k = `${ano}|${sel}`;
  if (!campanha.has(k)) campanha.set(k, { jogos: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, fases: new Set() });
  return campanha.get(k);
};
for (const p of partidas) {
  const sels = p.escalacoes.map((tab) => {
    const cont = {};
    for (const j of tab) { const s = selDe.get(chave(p.ano, C(j.wiki))); if (s) cont[s] = (cont[s] ?? 0) + 1; }
    return Object.entries(cont).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  });
  if (!sels[0] || !sels[1] || !p.caixa.placar) continue;
  const [g1, g2] = p.caixa.placar;
  const pen = p.caixa.penaltis;
  const fase = faseDe(p);
  [[0, g1, g2], [1, g2, g1]].forEach(([i, gp, gc]) => {
    const c = cp(p.ano, sels[i]);
    c.jogos++; c.gp += gp; c.gc += gc;
    const venceu = gp > gc || (gp === gc && pen && (i === 0 ? pen[0] > pen[1] : pen[1] > pen[0]));
    const perdeu = gp < gc || (gp === gc && pen && !venceu);
    if (venceu) c.v++; else if (perdeu) c.d++; else c.e++;
    c.fases.add(fase);
    if (fase === "final") c.final = venceu ? "campeao" : "vice";
  });
}
function faseDe(p) {
  const t = [p.pagina, ...p.fase].join(" ").toLowerCase();
  if (/third place|third-place/.test(t)) return "terceiro";
  if (/final round/.test(t)) return "semi"; // 1950: quadrangular final entre os quatro melhores
  if (/(^|\s)final(\s|$)|\bfinal$|match details|^.*world cup final/.test(p.pagina.toLowerCase()) || p.fase[0] === "Final") return "final";
  if (/semi/.test(t)) return "semi";
  if (/quarter/.test(t)) return "quartas";
  if (/round of 16|second round|round of 32/.test(t)) return "mata";
  return "grupos";
}
// Campeões conhecidos (1950 foi quadrangular final, sem "jogo final" formal).
const CAMPEOES = { 1950: "Uruguay", 1954: "West Germany", 1958: "Brazil", 1962: "Brazil", 1966: "England", 1970: "Brazil",
  1974: "West Germany", 1978: "Argentina", 1982: "Italy", 1986: "Argentina", 1990: "West Germany", 1994: "Brazil",
  1998: "France", 2002: "Brazil", 2006: "Italy", 2010: "Spain", 2014: "Germany", 2018: "France", 2022: "Argentina" };

// ---------- 5. Montagem final ----------
const fatos = convocados.map((c) => {
  const wiki = C(c.wiki);
  const s = stats.get(chave(c.ano, wiki)) ?? { jogos: 0, titular: 0, minutos: 0, gols: 0, codigos: {} };
  // Posições pela frequência nas escalações daquela Copa, completadas pela ficha.
  const cont = {};
  for (const [cod, n] of Object.entries(s.codigos)) for (const p of posDoCodigo(cod, c.ano) ?? []) cont[p] = (cont[p] ?? 0) + n;
  const total = Object.values(cont).reduce((a, b) => a + b, 0);
  const daCopa = Object.entries(cont).sort((a, b) => b[1] - a[1]).filter(([, n]) => n / total >= 0.2).map(([p]) => p);
  const daFicha = posDaFicha(ficha.get(wiki));
  const generica = { GK: ["GOL"], DF: ["ZAG"], MF: ["MC"], FW: ["CA"] }[c.pos] ?? ["MC"];
  let pos = [...daCopa];
  for (const p of daFicha) if (!pos.includes(p) && pos.length < 3) pos.push(p);
  if (!pos.length) pos = generica;
  if (c.pos === "GK") pos = ["GOL"]; else pos = pos.filter((p) => p !== "GOL");
  if (!pos.length) pos = generica;
  const camp = campanha.get(`${c.ano}|${c.selecao}`);
  return {
    ano: c.ano, selecao: c.selecao, no: c.no, nome: c.nome, wiki, nasc: c.nasc, pos,
    posBasica: c.pos, posFonte: daCopa.length ? "copa" : daFicha.length ? "ficha" : "generica",
    capsAntes: c.caps, clube: c.clube, capitao: c.capitao,
    jogos: s.jogos, titular: s.titular, minutos: s.minutos, gols: s.gols,
    ...carreira(ficha.get(wiki)),
    campanha: camp ? {
      jogos: camp.jogos, v: camp.v, e: camp.e, d: camp.d, gp: camp.gp, gc: camp.gc,
      fase: CAMPEOES[c.ano] === c.selecao ? "campeao" : camp.final ?? ["terceiro", "semi", "quartas", "mata", "grupos"].find((f) => camp.fases.has(f)) ?? "grupos",
    } : null,
  };
});
fs.writeFileSync(path.join(RAIZ, "dados/elencos/fatos.json"), JSON.stringify(fatos));

// Relatório
const porFonte = {};
for (const f of fatos) porFonte[f.posFonte] = (porFonte[f.posFonte] ?? 0) + 1;
console.log("posição por fonte:", porFonte);
console.log("convocados sem nenhum jogo registrado:", fatos.filter((f) => !f.jogos).length, "de", fatos.length);
console.log("seleções sem campanha:", [...new Set(fatos.filter((f) => !f.campanha).map((f) => f.ano + " " + f.selecao))].join(", ") || "nenhuma");
