// Folha de revisão de uma Copa: por seleção, quem jogou, com números e nota-base.
// uso: node ferramentas/folha.mjs 1970 [todos]
import fs from "node:fs";
import path from "node:path";
import { notaBase } from "./nota-base.mjs";
import { SELECOES } from "./selecoes.mjs";

const RAIZ = path.resolve(import.meta.dirname, "..");
const ano = +process.argv[2];
const todos = process.argv[3] === "todos";
const fatos = JSON.parse(fs.readFileSync(path.join(RAIZ, "dados/elencos/fatos.json"), "utf8")).filter((f) => f.ano === ano);
const ORDEM_FASE = { campeao: 0, vice: 1, terceiro: 2, semi: 3, quartas: 4, mata: 5, grupos: 6 };
const porSel = new Map();
for (const f of fatos) {
  if (!porSel.has(f.selecao)) porSel.set(f.selecao, []);
  porSel.get(f.selecao).push(f);
}
const sels = [...porSel.entries()].sort((a, b) => ORDEM_FASE[a[1][0].campanha?.fase ?? "grupos"] - ORDEM_FASE[b[1][0].campanha?.fase ?? "grupos"]);
for (const [sel, js] of sels) {
  const c = js[0].campanha;
  console.log(`@${SELECOES[sel].cod} ${sel} — ${c ? `${c.fase} ${c.v}V${c.e}E${c.d}D ${c.gp}-${c.gc}` : "?"}`);
  const lista = js.filter((f) => todos || f.titular > 0 || notaBase(f) >= 78).sort((a, b) => b.minutos - a.minutos);
  for (const f of lista) {
    const idade = f.nasc ? ano - +f.nasc.slice(0, 4) : "?";
    console.log(`  ${f.nome}|${f.pos.join(" ")}|${f.titular}/${f.jogos}${f.gols ? " " + f.gols + "g" : ""}|${notaBase(f)}`);
  }
  const resto = js.length - lista.length;
  if (resto) console.log(`  (+${resto} sem jogos)`);
}
