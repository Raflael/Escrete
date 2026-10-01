// A Copa do jogador: fase de grupos (3 jogos, tabela de 4) + oitavas, quartas, semi e final.
// Os adversários são elencos reais, cada vez mais fortes, jogando com a melhor escalação que têm.
import { derivar, escolherPonderado, embaralhar } from "./rng.js";
import { prepararLado, simularPartida } from "./partida.js";
import { melhorEscalacao } from "./time.js";

export const FASES = [
  { chave: "G1", nome: "Grupo · 1º jogo", tipo: "grupo" },
  { chave: "G2", nome: "Grupo · 2º jogo", tipo: "grupo" },
  { chave: "G3", nome: "Grupo · 3º jogo", tipo: "grupo" },
  { chave: "OIT", nome: "Oitavas de final", tipo: "mata" },
  { chave: "QUA", nome: "Quartas de final", tipo: "mata" },
  { chave: "SEM", nome: "Semifinal", tipo: "mata" },
  { chave: "FIN", nome: "Final", tipo: "mata" },
];

// Faixa de força (percentil entre todos os elencos) de onde sai o adversário de cada fase.
// Grupo tem um cabeça de chave, um médio e um mais fraco — em ordem aleatória.
export const FAIXAS = {
  grupo: [[0.5, 0.8], [0.25, 0.55], [0.02, 0.3]],
  OIT: [0.3, 0.7], QUA: [0.45, 0.82], SEM: [0.55, 0.9], FIN: [0.65, 0.97],
};

// Níveis do modo livre, em que o time pode ser só de craques: quanto mais alto, mais cedo vêm os gigantes.
export const DIFICULDADES = {
  normal: { nome: "Normal", faixas: FAIXAS },
  dificil: {
    nome: "Difícil",
    faixas: { grupo: [[0.75, 0.95], [0.6, 0.85], [0.45, 0.75]], OIT: [0.65, 0.9], QUA: [0.78, 0.96], SEM: [0.86, 0.99], FIN: [0.92, 1] },
  },
  lendaria: {
    nome: "Lendária",
    faixas: { grupo: [[0.9, 1], [0.86, 0.98], [0.82, 0.95]], OIT: [0.88, 1], QUA: [0.92, 1], SEM: [0.95, 1], FIN: [0.97, 1] },
  },
};

const FORMACAO_ADV = (elenco) => (elenco.ano <= 1962 ? "WM" : elenco.ano <= 1974 ? "4-2-4" : "4-4-2");

// Prepara todos os elencos como adversários possíveis (uma vez por sessão; é determinístico).
export function prepararAdversarios(dados) {
  const lista = dados.elencos.map((e) => {
    const formacao = FORMACAO_ADV(e);
    // Cada jogador sabe de onde veio (entrosamento, elencos usados no draft).
    for (const j of e.js) { j.sel = e.sel; j.ano = e.ano; }
    const escalacao = melhorEscalacao(formacao, e.js);
    const lado = prepararLado({ nome: `${dados.selecoes[e.sel].nome} ${e.ano}`, formacao, estilo: "equilibrado", escalacao });
    return { elenco: e, lado, forca: (lado.av.ataque + lado.av.defesa) / 2 + lado.av.goleiro * 0.1 };
  });
  lista.sort((a, b) => a.forca - b.forca);
  lista.forEach((a, i) => (a.percentil = i / (lista.length - 1)));
  return lista;
}

function sortearAdversario(rng, advs, [de, ate], evitar) {
  const pool = advs.filter((a) => a.percentil >= de && a.percentil <= ate && !evitar.has(a.elenco.id));
  const base = pool.length ? pool : advs.filter((a) => !evitar.has(a.elenco.id));
  return escolherPonderado(rng, base, base.map(() => 1));
}

// meuLado: { nome, formacao, estilo, escalacao }. evitar: ids de elencos que não podem ser adversários
// (os que o jogador usou no draft, por exemplo).
export function simularCopa(semente, meuLado, advs, { evitar = [], dificuldade = "normal" } = {}) {
  const F = (DIFICULDADES[dificuldade] ?? DIFICULDADES.normal).faixas;
  const rngAdv = derivar(semente, "adversarios");
  const rngJogo = derivar(semente, "jogos");
  const usados = new Set(evitar);
  const eu = prepararLado(meuLado);

  // Grupo: 3 adversários de faixas diferentes, em ordem embaralhada.
  const grupo = embaralhar(rngAdv, F.grupo).map((faixa) => {
    const a = sortearAdversario(rngAdv, advs, faixa, usados);
    usados.add(a.elenco.id);
    return a;
  });

  const jogos = [];
  const tabela = [eu, ...grupo.map((g) => g.lado)].map((lado, i) => ({ i, nome: lado.nome, pts: 0, sg: 0, gp: 0, j: 0 }));
  const somar = (i, gp, gc) => {
    const t = tabela[i];
    t.j++; t.gp += gp; t.sg += gp - gc; t.pts += gp > gc ? 3 : gp === gc ? 1 : 0;
  };

  // Rodadas do grupo: jogador x adversário k, e os outros dois entre si.
  const outros = [[1, 2], [0, 2], [0, 1]]; // índices em `grupo` que se enfrentam na rodada k
  for (let k = 0; k < 3; k++) {
    const adv = grupo[k];
    const r = simularPartida(rngJogo, eu, adv.lado);
    somar(0, r.gA, r.gB);
    somar(k + 1, r.gB, r.gA);
    const [x, y] = outros[k];
    const r2 = simularPartida(rngJogo, grupo[x].lado, grupo[y].lado);
    somar(x + 1, r2.gA, r2.gB);
    somar(y + 1, r2.gB, r2.gA);
    jogos.push({ fase: FASES[k], adversario: adv.elenco.id, advNome: adv.lado.nome, advLado: adv.lado, ...r });
  }
  const classificacao = tabela.slice().sort((a, b) => b.pts - a.pts || b.sg - a.sg || b.gp - a.gp || a.i - b.i);
  const posicao = classificacao.findIndex((t) => t.i === 0) + 1;
  let vivo = posicao <= 2;

  for (const fase of FASES.slice(3)) {
    if (!vivo) break;
    const adv = sortearAdversario(rngAdv, advs, F[fase.chave], usados);
    usados.add(adv.elenco.id);
    const r = simularPartida(rngJogo, eu, adv.lado, { mataMata: true });
    jogos.push({ fase, adversario: adv.elenco.id, advNome: adv.lado.nome, advLado: adv.lado, ...r });
    if (r.vencedor !== "A") vivo = false;
  }

  const campeao = vivo && jogos.length === 7;
  const vitorias = jogos.filter((j) => j.vencedor === "A" || (!j.fase.tipo.startsWith("mata") && j.gA > j.gB)).length;
  const gp = jogos.reduce((s, j) => s + j.gA, 0), gc = jogos.reduce((s, j) => s + j.gB, 0);
  return {
    jogos, tabela: classificacao, posicaoGrupo: posicao, campeao,
    vitorias, gp, gc,
    // As marcas: 7 vitórias no tempo normal ou prorrogação (pênalti não conta) e sem sofrer gol.
    setePerfeito: campeao && jogos.every((j) => j.gA > j.gB),
    semSofrer: campeao && gc === 0,
    avaliacao: eu.av,
  };
}
