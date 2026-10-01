// Passo 1 dos dados: páginas "<ano> FIFA World Cup squads" -> dados/elencos/convocados.json
// Só fatos públicos: quem foi convocado, número, posição básica, idade, jogos pela seleção, clube.
import fs from "node:fs";
import path from "node:path";
import { wikitext } from "./wiki.mjs";
import { templates, link, limpo, secaoAntes } from "./wikitexto.mjs";

import { ANOS } from "./comum.mjs";
const RAIZ = path.resolve(import.meta.dirname, "..");
const RE_JOGADOR = /^(nat fs( [a-z])? player|national football squad player)$/i;

function nascimento(idade) {
  // {{Birth date and age2|df=yes|1970|5|31|1937|12|24}} -> 1937-12-24
  const nums = [...(idade ?? "").matchAll(/\|\s*(\d{1,4})\s*(?=[|}])/g)].map((m) => +m[1]);
  if (nums.length >= 6) return `${nums[3]}-${String(nums[4]).padStart(2, "0")}-${String(nums[5]).padStart(2, "0")}`;
  const ano = /(1[89]\d\d|20[0-2]\d)/.exec(idade ?? "");
  return ano ? ano[1] : null;
}

const convocados = [];
for (const ano of ANOS) {
  const texto = await wikitext(`${ano} FIFA World Cup squads`);
  let n = 0;
  for (const { params: p, inicio } of templates(texto, RE_JOGADOR)) {
    const selecao = secaoAntes(texto, inicio);
    const lk = link(p.name);
    const nome = lk ? lk.texto : limpo(p.name);
    if (!nome) continue;
    convocados.push({
      ano,
      selecao,
      no: p.no ? +limpo(p.no) || null : null,
      pos: (p.pos ?? "").toUpperCase().slice(0, 2),
      nome: nome.replace(/\s*\(.*?\)\s*$/, ""),
      wiki: lk?.alvo ?? null,
      nasc: nascimento(p.age),
      caps: p.caps && /^\d+$/.test(limpo(p.caps)) ? +limpo(p.caps) : null,
      gols: p.goals && /^\d+$/.test(limpo(p.goals)) ? +limpo(p.goals) : null,
      clube: limpo(p.club) || null,
      capitao: /captain|\|c\]\]|\(c\)/i.test((p.name ?? "") + (p.other ?? "")),
    });
    n++;
  }
  const times = new Set(convocados.filter((c) => c.ano === ano).map((c) => c.selecao));
  console.log(ano, `${times.size} seleções, ${n} convocados`);
}

fs.writeFileSync(path.join(RAIZ, "dados/elencos/convocados.json"), JSON.stringify(convocados, null, 0));
console.log("total:", convocados.length);
