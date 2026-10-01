// Passo 2: baixa a página de cada jogador convocado (cache em dados/brutos/wiki/jogadores).
import fs from "node:fs";
import { variosWikitexts } from "./wiki.mjs";
const conv = JSON.parse(fs.readFileSync("dados/elencos/convocados.json", "utf8"));
const titulos = [...new Set(conv.map((c) => c.wiki).filter(Boolean))];
console.log("jogadores únicos com página:", titulos.length);
const t0 = Date.now();
const r = await variosWikitexts(titulos);
console.log("sem página:", [...r.values()].filter((v) => v == null).length, "em", ((Date.now() - t0) / 1000).toFixed(0) + "s");
