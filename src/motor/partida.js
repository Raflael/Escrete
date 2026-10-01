// Uma partida: gols por Poisson log-linear, autores e minutos, prorrogação e pênaltis cobrança a cobrança.
import { FORMACOES, PESO, ESTILOS, forcaNaVaga } from "./formacoes.js";
import { avaliarTime } from "./time.js";
import { poisson, escolherPonderado } from "./rng.js";

// Parâmetros do modelo — ajustados por simulação em testes/balanceamento.mjs.
export const MODELO = {
  base: 1.1,        // gols esperados entre dois times iguais
  escala: 11,       // quão rápido a diferença (ataque - defesa) vira vantagem...
  teto: 1.6,        // ...e até onde: o multiplicador satura em e^teto (~5x), senão todo jogo desigual vira 7 a 0
  escalaGoleiro: 30,
  goleiroRef: 78,
  forma: 0.15,      // desvio do "dia inspirado" de cada time (log-normal)
  minLambda: 0.1,
  maxLambda: 5,
};

// Um "lado" é { nome, formacao, estilo, escalacao } — serve para o jogador e para o adversário.
export function prepararLado(lado) {
  const av = avaliarTime(lado.formacao, lado.escalacao);
  return { ...lado, av, estilo: ESTILOS[lado.estilo ?? "equilibrado"] };
}

export function lambdaGols(atacante, defensor, rng) {
  const a = atacante.av, d = defensor.av;
  const dif = (a.ataque + a.entrosamento) - (d.defesa + d.entrosamento);
  const goleiro = Math.exp(-(d.goleiro - MODELO.goleiroRef) / MODELO.escalaGoleiro);
  const forma = rng ? Math.exp(MODELO.forma * normal(rng)) : 1;
  const vantagem = Math.exp(MODELO.teto * Math.tanh(dif / (MODELO.escala * MODELO.teto)));
  const l = MODELO.base * vantagem * goleiro * atacante.estilo.marca * defensor.estilo.sofre * forma;
  return Math.min(MODELO.maxLambda, Math.max(MODELO.minLambda, l));
}

function normal(rng) {
  const u = Math.max(1e-9, rng()), v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// Quem marca: peso ofensivo da vaga x força (exponencial: craque decide).
// Cada gol reduz a chance do mesmo jogador marcar de novo — hat-trick é raro, não impossível.
function sortearAutores(rng, lado, n) {
  const vagas = FORMACOES[lado.formacao];
  const cand = [], pesos = [];
  vagas.forEach((v, i) => {
    const j = lado.escalacao[i];
    if (!j || v.pos === "GOL") return;
    cand.push(j);
    pesos.push(PESO[v.pos].atk * Math.exp((forcaNaVaga(j, v.pos) - 75) / 9));
  });
  const autores = [];
  for (let k = 0; k < n; k++) {
    const j = escolherPonderado(rng, cand, pesos);
    autores.push(j);
    pesos[cand.indexOf(j)] *= 0.55;
  }
  return autores;
}

function minutos(rng, n, de, ate) {
  const ms = [];
  for (let k = 0; k < n; k++) ms.push(de + Math.floor(rng() * (ate - de + 1)));
  return ms.sort((a, b) => a - b);
}

// Pênaltis: cinco cobranças alternadas e morte súbita. Chance de gol depende do cobrador x goleiro.
function disputaPenaltis(rng, A, B) {
  const cobradores = (lado) => {
    const vagas = FORMACOES[lado.formacao];
    return vagas
      .map((v, i) => ({ v, j: lado.escalacao[i] }))
      .filter(({ v, j }) => j && v.pos !== "GOL")
      .map(({ v, j }) => ({ j, nota: forcaNaVaga(j, v.pos) + 12 * PESO[v.pos].atk }))
      .sort((a, b) => b.nota - a.nota)
      .map((x) => x.j);
  };
  const lista = { A: cobradores(A), B: cobradores(B) };
  const gk = { A: A.av.goleiro, B: B.av.goleiro };
  const placar = { A: 0, B: 0 };
  const cobrancas = [];
  const chance = (j, goleiro) => Math.min(0.92, Math.max(0.55, 0.75 + (j.f - 75) * 0.006 - (goleiro - 78) * 0.006));
  for (let r = 0; r < 30; r++) {
    for (const lado of ["A", "B"]) {
      const outro = lado === "A" ? "B" : "A";
      const j = lista[lado][r % lista[lado].length];
      const gol = rng() < chance(j, gk[outro]);
      if (gol) placar[lado]++;
      cobrancas.push({ lado, autor: j, gol });
      // Encerra quando não há mais como alcançar (nas 5 primeiras) ou na morte súbita.
      const feitas = { A: cobrancas.filter((c) => c.lado === "A").length, B: cobrancas.filter((c) => c.lado === "B").length };
      if (r < 5) {
        const restA = 5 - feitas.A, restB = 5 - feitas.B;
        if (placar.A + restA < placar.B || placar.B + restB < placar.A) return { placar, cobrancas };
      } else if (lado === "B" && placar.A !== placar.B) return { placar, cobrancas };
    }
    if (r === 4 && placar.A !== placar.B) return { placar, cobrancas };
  }
  return { placar, cobrancas };
}

// Simula um jogo. mataMata: empate vai para prorrogação e pênaltis.
export function simularPartida(rng, ladoA, ladoB, { mataMata = false } = {}) {
  const A = ladoA.av ? ladoA : prepararLado(ladoA);
  const B = ladoB.av ? ladoB : prepararLado(ladoB);
  const lA = lambdaGols(A, B, rng), lB = lambdaGols(B, A, rng);
  let gA = poisson(rng, lA), gB = poisson(rng, lB);
  const gols = [];
  const registrar = (lado, time, n, de, ate) => {
    const autores = sortearAutores(rng, time, n);
    minutos(rng, n, de, ate).forEach((min, k) => gols.push({ min, lado, autor: autores[k] }));
  };
  registrar("A", A, gA, 1, 90);
  registrar("B", B, gB, 1, 90);
  let prorrogacao = false, penaltis = null;
  if (mataMata && gA === gB) {
    prorrogacao = true;
    // Prorrogação: 30 minutos, com times cansados (um pouco menos de gols por minuto).
    const pA = poisson(rng, lA * 0.28), pB = poisson(rng, lB * 0.28);
    registrar("A", A, pA, 91, 120);
    registrar("B", B, pB, 91, 120);
    gA += pA; gB += pB;
    if (gA === gB) penaltis = disputaPenaltis(rng, A, B);
  }
  gols.sort((a, b) => a.min - b.min);
  let vencedor = gA > gB ? "A" : gB > gA ? "B" : null;
  if (penaltis) vencedor = penaltis.placar.A > penaltis.placar.B ? "A" : "B";
  return { gA, gB, gols, prorrogacao, penaltis, vencedor, lambdas: [lA, lB] };
}
