// Camada 1 das notas: uma nota-base para cada convocado, calculada só a partir de fatos.
// A camada 2 (dados/notas/*.txt) sobrescreve com avaliação individual.
import fs from "node:fs";
import path from "node:path";

const RAIZ = path.resolve(import.meta.dirname, "..");
const fatos = JSON.parse(fs.readFileSync(path.join(RAIZ, "dados/elencos/fatos.json"), "utf8"));

const FASE = { grupos: 0, mata: 0.3, quartas: 0.5, semi: 0.68, terceiro: 0.68, vice: 0.85, campeao: 1 };
const lim = (x, a, b) => Math.max(a, Math.min(b, x));

// Percentil dentro da mesma Copa: 100 jogos pela seleção em 1958 não é o mesmo que em 2022.
function percentis(campo) {
  const porAno = new Map();
  for (const f of fatos) {
    const v = f[campo] ?? f.capsAntes ?? 0;
    if (!porAno.has(f.ano)) porAno.set(f.ano, []);
    porAno.get(f.ano).push(v);
  }
  for (const vs of porAno.values()) vs.sort((a, b) => a - b);
  return (f) => {
    const vs = porAno.get(f.ano), v = f[campo] ?? f.capsAntes ?? 0;
    let lo = 0, hi = vs.length;
    while (lo < hi) { const m = (lo + hi) >> 1; if (vs[m] < v) lo = m + 1; else hi = m; }
    return lo / vs.length;
  };
}
const pCaps = percentis("capsCarreira");
const pGols = percentis("golsCarreira");

export function notaBase(f) {
  const c = f.campanha;
  const time = c
    ? 0.6 * FASE[c.fase] + 0.25 * lim((3 * c.v + c.e) / (3 * c.jogos), 0, 1) + 0.15 * lim((c.gp - c.gc) / c.jogos / 4 + 0.5, 0, 1)
    : 0.2;
  const papel = c ? lim(f.minutos / (c.jogos * 90), 0, 1) : 0;
  const atacante = f.pos.some((p) => ["CA", "PD", "PE", "MEI"].includes(p));
  const estatura = atacante ? 0.6 * pCaps(f) + 0.4 * pGols(f) : pCaps(f);
  const gols = atacante ? Math.min(6, 1.3 * f.gols) : Math.min(3, 1.5 * f.gols);
  // Idade: auge entre 25 e 30; muito novo ou veterano perde um pouco.
  const idade = f.nasc ? f.ano - +f.nasc.slice(0, 4) : 27;
  const auge = idade < 21 ? -2 : idade > 33 ? -1.5 : 0;
  return Math.round(lim(57 + 13 * time + 8 * papel + 10 * estatura + gols + auge, 55, 89));
}

if (process.argv[1] === import.meta.filename) {
  const notas = fatos.map((f) => ({ ...f, base: notaBase(f) }));
  fs.writeFileSync(path.join(RAIZ, "dados/elencos/notas-base.json"), JSON.stringify(notas.map((n) => ({ ano: n.ano, wiki: n.wiki, selecao: n.selecao, base: n.base }))));
  const hist = {};
  for (const n of notas) hist[n.base] = (hist[n.base] ?? 0) + 1;
  console.log("distribuição:", Object.entries(hist).map(([k, v]) => `${k}:${v}`).join(" "));
  for (const [a, s] of [[1970, "Brazil"], [2022, "Saudi Arabia"], [1982, "Kuwait"], [2014, "Germany"]]) {
    const xs = notas.filter((n) => n.ano === a && n.selecao === s).sort((p, q) => q.base - p.base);
    console.log(`\n${a} ${s}: ` + xs.map((x) => `${x.nome} ${x.base}`).join(", "));
  }
}
