// Placares parecem futebol? Média de gols, empates, goleadas e pênaltis numa amostra de Copas.
import fs from "node:fs";
import { prepararAdversarios, simularCopa } from "../src/motor/copa.js";
import { melhorEscalacao } from "../src/motor/time.js";
const dados = JSON.parse(fs.readFileSync(new URL("../dados/jogo/elencos.json", import.meta.url), "utf8"));
const advs = prepararAdversarios(dados);
let jogos = 0, gols = 0, empates = 0, goleadas = 0, penaltis = 0, prorrog = 0, mata = 0;
const placares = {};
for (let k = 0; k < 3000; k++) {
  const base = advs[Math.floor((0.55 + 0.4 * ((k * 7919) % 1000) / 1000) * advs.length)];
  const eu = { nome: "t", formacao: "4-3-3", estilo: "equilibrado", escalacao: melhorEscalacao("4-3-3", base.elenco.js) };
  const r = simularCopa("placar" + k, eu, advs, { evitar: [base.elenco.id] });
  for (const j of r.jogos) {
    jogos++; gols += j.gA + j.gB;
    if (j.fase.tipo === "mata") { mata++; if (j.prorrogacao) prorrog++; if (j.penaltis) penaltis++; }
    else if (j.gA === j.gB) empates++;
    if (Math.abs(j.gA - j.gB) >= 4) goleadas++;
    const p = `${Math.max(j.gA, j.gB)}-${Math.min(j.gA, j.gB)}`;
    placares[p] = (placares[p] ?? 0) + 1;
  }
}
const pct = (x, n) => (100 * x / n).toFixed(1) + "%";
console.log(`gols/jogo ${(gols / jogos).toFixed(2)} · empate no grupo ${pct(empates, jogos - mata)} · goleada (4+) ${pct(goleadas, jogos)} · prorrogação ${pct(prorrog, mata)} · pênaltis ${pct(penaltis, mata)}`);
console.log("placares mais comuns:", Object.entries(placares).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([p, n]) => `${p} ${pct(n, jogos)}`).join(" · "));
