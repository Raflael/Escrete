// Balanceamento sem navegador: simula drafts com jogadores de perfis diferentes e roda Copas.
// uso: node testes/balanceamento.mjs [drafts=400] [copasPorDraft=25]
import fs from "node:fs";
import { prepararAdversarios, simularCopa } from "../src/motor/copa.js";
import { novoDraft, rolar, resortear, escalar, jogadoresUteis, completo } from "../src/motor/draft.js";
import { FORMACOES, forcaNaVaga } from "../src/motor/formacoes.js";
import { avaliarTime } from "../src/motor/time.js";
import { MODELO } from "../src/motor/partida.js";
import { criarRng } from "../src/motor/rng.js";

const dados = JSON.parse(fs.readFileSync(new URL("../dados/jogo/elencos.json", import.meta.url), "utf8"));
const advs = prepararAdversarios(dados);
const N = +(process.argv[2] ?? 400), C = +(process.argv[3] ?? 25);

// Perfis: "craque" escolhe sempre o melhor e usa re-sorteio quando o elenco é fraco;
// "casual" escolhe entre os três melhores ao acaso e nunca re-sorteia.
function draftar(perfil, semente) {
  let d = novoDraft({ semente, formacao: "4-3-3" });
  const rng = criarRng(semente + ":decisoes");
  for (let guarda = 0; !completo(d) && guarda < 60; guarda++) {
    d = rolar(d, advs);
    const opcoes = () => {
      const el = advs.find((a) => a.elenco.id === d.atual).elenco;
      const lista = [];
      for (const j of jogadoresUteis(d, el))
        FORMACOES[d.formacao].forEach((v, i) => {
          if (d.escalacao[i]) return;
          const f = forcaNaVaga(j, v.pos);
          if (f != null) lista.push({ j, i, f });
        });
      return lista.sort((a, b) => b.f - a.f);
    };
    let ops = opcoes();
    if (perfil === "craque" && ops[0].f < 84 && d.resorteiosRestantes > 0) {
      d = resortear(d, advs, rng() < 0.5 ? "copa" : "selecao", dados.selecoes);
      ops = opcoes();
    }
    if (!ops.length) continue;
    const pick = perfil === "craque" ? ops[0] : ops[Math.floor(rng() * Math.min(3, ops.length))];
    d = escalar(d, pick.j, pick.i);
  }
  return d;
}

for (const perfil of ["casual", "craque"]) {
  const r = { geral: [], campeao: 0, perfeito: 0, semSofrer: 0, ambos: 0, grupo: 0, porFase: [0, 0, 0, 0, 0, 0, 0, 0], total: 0 };
  for (let k = 0; k < N; k++) {
    const d = draftar(perfil, `${perfil}-${k}`);
    if (!completo(d)) continue;
    const lado = { nome: "Meu time", formacao: d.formacao, estilo: "equilibrado", escalacao: d.escalacao };
    r.geral.push(avaliarTime(d.formacao, d.escalacao).geral);
    for (let c = 0; c < C; c++) {
      const res = simularCopa(`${perfil}-${k}-copa${c}`, lado, advs, { evitar: d.elencosUsados });
      r.total++;
      if (res.campeao) r.campeao++;
      if (res.setePerfeito) r.perfeito++;
      if (res.semSofrer) r.semSofrer++;
      if (res.setePerfeito && res.semSofrer) r.ambos++;
      if (res.posicaoGrupo > 2) r.grupo++;
      r.porFase[res.jogos.length]++;
    }
  }
  const g = r.geral.sort((a, b) => a - b), pct = (x) => ((100 * x) / r.total).toFixed(1) + "%";
  console.log(`\n${perfil.toUpperCase()}: nota do time p10 ${g[Math.floor(g.length * 0.1)].toFixed(1)} · mediana ${g[g.length >> 1].toFixed(1)} · p90 ${g[Math.floor(g.length * 0.9)].toFixed(1)}`);
  console.log(`  cai no grupo ${pct(r.grupo)} · campeão ${pct(r.campeao)} · 7 vitórias ${pct(r.perfeito)} · campeão sem sofrer gol ${pct(r.semSofrer)} · 7 vitórias sem sofrer ${pct(r.ambos)}`);
}
const forcas = advs.map((a) => a.forca);
console.log(`\nadversários: mais fraco ${forcas[0].toFixed(1)} · mediana ${forcas[forcas.length >> 1].toFixed(1)} · p90 ${forcas[Math.floor(forcas.length * 0.9)].toFixed(1)} · mais forte ${forcas.at(-1).toFixed(1)} (${advs.at(-1).lado.nome})`);
console.log("modelo:", JSON.stringify(MODELO));
