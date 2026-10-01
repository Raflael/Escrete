// Balanceamento do modo livre: time dos sonhos sem limite x time dentro do orçamento, em cada dificuldade.
import fs from "node:fs";
import { prepararAdversarios, simularCopa, DIFICULDADES } from "../src/motor/copa.js";
import { melhorEscalacao, avaliarTime } from "../src/motor/time.js";
import { FORMACOES, forcaNaVaga } from "../src/motor/formacoes.js";
import { preco, ORCAMENTO } from "../src/motor/orcamento.js";

const dados = JSON.parse(fs.readFileSync(new URL("../dados/jogo/elencos.json", import.meta.url), "utf8"));
const advs = prepararAdversarios(dados);
const todos = [];
const vistos = new Set();
for (const e of dados.elencos) for (const j of e.js) todos.push(j);

// Time dos sonhos: a melhor versão de cada jogador, sem repetir a mesma pessoa.
const sonho = melhorEscalacao("4-3-3", todos.filter((j) => (vistos.has(j.id) ? false : (vistos.add(j.id), true))).sort((a, b) => b.f - a.f));

// Orçamento: guloso por vaga mais cara primeiro, sempre deixando dinheiro para completar o time com os mais baratos.
function timeOrcamento() {
  const vagas = FORMACOES["4-3-3"];
  const esc = vagas.map(() => null);
  const usados = new Set();
  let resta = ORCAMENTO;
  const ordem = [...vagas.keys()].sort((a, b) => (vagas[a].pos === "CA" ? -1 : 0) - (vagas[b].pos === "CA" ? -1 : 0));
  for (const i of ordem) {
    const vazias = esc.filter((x) => !x).length - 1;
    const teto = resta - vazias * 12; // reserva para completar
    // melhor custo-benefício: maior força que caiba, preferindo quem custa até 1/(vazias+1) do que sobra x 1.6
    const alvo = Math.min(teto, (resta / (vazias + 1)) * 1.6);
    let melhor = null;
    for (const j of todos) {
      if (usados.has(j.id)) continue;
      const f = forcaNaVaga(j, vagas[i].pos);
      if (f == null || preco(j) > alvo) continue;
      if (!melhor || f > melhor.f2) melhor = { j, f2: f };
    }
    esc[i] = melhor.j; usados.add(melhor.j.id); resta -= preco(melhor.j);
  }
  return esc;
}
const orc = timeOrcamento();

for (const [nome, esc] of [["Sonho (sem limite)", sonho], ["Orçamento 1000", orc]]) {
  const av = avaliarTime("4-3-3", esc);
  const custo = esc.reduce((s, j) => s + preco(j), 0);
  console.log(`\n${nome}: nota ${av.geral.toFixed(1)} · custo ${custo} · ${esc.map((j) => j.n.split(" ").at(-1)).join(", ")}`);
  for (const dif of Object.keys(DIFICULDADES)) {
    let campeao = 0, sete = 0, perfeito = 0;
    const N = 1500;
    for (let k = 0; k < N; k++) {
      const r = simularCopa(`${nome}-${dif}-${k}`, { nome: "t", formacao: "4-3-3", estilo: "equilibrado", escalacao: esc }, advs, { dificuldade: dif, evitar: [...new Set(esc.map((j) => `${j.ano}-${j.sel}`))] });
      if (r.campeao) campeao++;
      if (r.setePerfeito) sete++;
      if (r.setePerfeito && r.semSofrer) perfeito++;
    }
    const p = (x) => (100 * x / N).toFixed(1) + "%";
    console.log(`  ${DIFICULDADES[dif].nome.padEnd(9)} campeão ${p(campeao)} · 7 em 7 ${p(sete)} · perfeito ${p(perfeito)}`);
  }
}
