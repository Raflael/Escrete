// Passo 3 dos dados: páginas de grupos e mata-mata de cada Copa -> dados/elencos/partidas.json
// De cada jogo: escalações (titular/reserva e posição naquela partida), placar e autores dos gols.
import fs from "node:fs";
import path from "node:path";
import { wikitext, api } from "./wiki.mjs";
import { templates, link, limpo, secaoAntes } from "./wikitexto.mjs";
import { ANOS } from "./comum.mjs";

const RAIZ = path.resolve(import.meta.dirname, "..");

// Subpáginas de jogos a partir da página principal da Copa.
async function paginasDeJogos(ano) {
  const cache = path.join(RAIZ, `dados/brutos/wiki/_indice_${ano}.json`);
  let titulos;
  if (fs.existsSync(cache)) titulos = JSON.parse(fs.readFileSync(cache, "utf8"));
  else {
    const j = await api({ action: "query", list: "allpages", apprefix: `${ano} FIFA World Cup`, aplimit: "500", apfilterredir: "nonredirects" });
    titulos = j.query.allpages.map((p) => p.title);
    fs.writeFileSync(cache, JSON.stringify(titulos));
  }
  // Grupos, mata-mata, fase final e final — nada de eliminatórias, elencos ou transmissão.
  const re = new RegExp(`^${ano} FIFA World Cup (Group [A-Z0-9]+|group stage|first round|second round|knockout stage|final round|final)$`, "i");
  return titulos.filter((t) => re.test(t));
}

// Tabelas de escalação: linhas "|POS ||'''NO'''||[[Link|Nome]]".
const RE_LINHA = /^\|\s*([A-Z]{1,3})\s*\|\|\s*(?:'''\s*(\d+)?\s*''')?\s*\|\|\s*(.+)$/;

function escalacoes(texto) {
  const tabelas = [];
  let atual = null, reservas = false, offset = 0;
  for (const bruta of texto.split("\n")) {
    const linha = bruta.trim();
    const aqui = offset;
    offset += bruta.length + 1;
    const m = RE_LINHA.exec(linha);
    if (m) {
      if (!atual) { atual = []; atual.inicio = aqui; reservas = false; }
      const lk = link(m[3]);
      if (!lk) continue;
      const entrou = /\{\{\s*sub\s*on/i.test(m[3]);
      const saiu = /\{\{\s*sub\s*off\s*\|\s*(\d+)/i.exec(m[3]);
      const minEntrou = /\{\{\s*sub\s*on\s*\|\s*(\d+)/i.exec(m[3]);
      if (reservas && !entrou) continue; // reserva que não entrou
      atual.push({
        pos: m[1], no: m[2] ? +m[2] : null, wiki: lk.alvo, titular: !reservas,
        min: reservas ? Math.max(1, 90 - (minEntrou ? +minEntrou[1] : 75)) : saiu ? +saiu[1] : 90,
      });
      continue;
    }
    if (atual && /Substitut/i.test(linha)) { reservas = true; continue; }
    if (atual && (/Manager|Coach|Head coach/i.test(linha) || /^\|\}/.test(linha))) {
      if (atual.length >= 7) tabelas.push(atual);
      atual = null;
    }
  }
  return tabelas;
}

// Caixas de jogo: {{Football box ...}} com times, placar e gols.
function caixas(texto) {
  return templates(texto, /^(#invoke:\s*)?football ?box( collapsible)?$/i).map(({ params: p, inicio }) => {
    const gols = (campo) =>
      // [[Jogador]] seguido de um ou mais {{goal|30||79}}; o minuto seguido de "o.g." é gol contra e fica de fora.
      [...(campo ?? "").matchAll(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]((?:\s*\{\{\s*goal\s*\|[^}]*\}\})+)/gi)].flatMap(([, alvo, tpls]) =>
        [...tpls.matchAll(/\{\{\s*goal\s*\|([^}]*)\}\}/gi)].flatMap(([, corpo]) => {
          const partes = corpo.split("|").map((x) => x.trim());
          const saida = [];
          partes.forEach((x, i) => {
            if (!/^\d/.test(x)) return;
            const marca = partes[i + 1] ?? "";
            if (/^(og|o\.g\.)$/i.test(marca)) return;
            saida.push({ wiki: alvo.trim(), min: parseInt(x, 10), pen: /^pen/i.test(marca) });
          });
          return saida;
        }));
    // {{fb-rt|BRA|1889}}, {{#invoke:flagg|main|unpre|avar=fb|ARG}}... -> código de 3 letras; senão o texto visível.
    const time = (s) => /\|\s*([A-Z]{3})\s*(?=\||\}\})/.exec(s ?? "")?.[1] ?? limpo(s).replace(/\s*\(.*\)\s*$/, "").trim();
    // {{Start date|1950|6|24}} -> "1950-6-24"
    const data = (s) => { const n = (s ?? "").match(/\d{1,4}/g) ?? []; return n.slice(0, 3).join("-"); };
    // Placar: {{score link|...|4–0}} ou "4–0" ou "1–1 ([[a.e.t.]])"
    const placar = (s) => { const m = /(\d+)\s*[–-]\s*(\d+)/.exec((s ?? "").replace(/\{\{\s*score link\s*\|[^|]*\|/i, "")); return m ? [+m[1], +m[2]] : null; };
    const pen = (s) => { const m = /(\d+)\s*[–-]\s*(\d+)/.exec(s ?? ""); return m ? [+m[1], +m[2]] : null; };
    return {
      inicio,
      time1: time(p.team1), time2: time(p.team2),
      placar: placar(p.score),
      prorrogacao: /a\.?e\.?t/i.test(p.score ?? ""),
      gols1: gols(p.goals1), gols2: gols(p.goals2),
      penaltis: pen(p.penaltyscore),
      data: data(p.date),
    };
  });
}

const partidas = [];
for (const ano of ANOS) {
  const paginas = await paginasDeJogos(ano);
  const vistos = new Set();
  let nJogos = 0;
  for (const titulo of paginas) {
    let texto;
    try { texto = await wikitext(titulo); } catch (e) { console.log("  (sem página)", titulo); continue; }
    const tabs = escalacoes(texto);
    const cxs = caixas(texto);
    // Cada escalação pertence à última caixa de jogo que aparece antes dela.
    const porCaixa = new Map();
    for (const t of tabs) {
      const cx = cxs.filter((c) => c.inicio < t.inicio).at(-1);
      if (!cx) continue;
      if (!porCaixa.has(cx)) porCaixa.set(cx, []);
      porCaixa.get(cx).push(t);
    }
    for (const [cx, ts] of porCaixa) {
      if (ts.length !== 2) continue; // página fora do padrão: melhor perder o jogo que misturar dois
      // O mesmo jogo aparece em mais de uma página (a final, por exemplo): uma vez só.
      const chave = `${cx.time1}|${cx.time2}|${cx.data}`;
      if (vistos.has(chave)) continue;
      vistos.add(chave);
      // Seções de nível 2 e 3 antes da caixa dizem a fase ("Group 1", "Quarter-finals", "Final"...).
      const fase = [secaoAntes(texto, cx.inicio, 2, 2), secaoAntes(texto, cx.inicio, 3, 3)].filter(Boolean);
      partidas.push({ ano, pagina: titulo, fase, caixa: cx, escalacoes: ts });
      nJogos++;
    }
  }
  console.log(ano, `${paginas.length} páginas, ${nJogos} jogos com escalação`);
}
fs.writeFileSync(path.join(RAIZ, "dados/elencos/partidas.json"), JSON.stringify(partidas));
console.log("total de jogos:", partidas.length);
