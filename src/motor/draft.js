// O draft: sorteia um elenco (seleção + Copa), o jogador escolhe alguém dele para uma vaga livre.
import { derivar, escolherPonderado } from "./rng.js";
import { FORMACOES, custoImproviso } from "./formacoes.js";

export const MODOS = {
  classico: { nome: "Clássico", resorteios: 3, forcaVisivel: true },
  almanaque: { nome: "Almanaque", resorteios: 1, forcaVisivel: false },
};

export function novoDraft({ semente, formacao = "4-3-3", estilo = "equilibrado", modo = "classico" }) {
  return {
    semente, formacao, estilo, modo,
    escalacao: FORMACOES[formacao].map(() => null),
    usados: [],            // ids de jogador já escalados (o mesmo jogador não entra duas vezes)
    elencosUsados: [],     // ids de elenco que forneceram jogadores
    rolagem: 0,
    resorteiosRestantes: MODOS[modo].resorteios,
    atual: null,           // id do elenco sorteado agora
    recentes: [],
  };
}

// Peso do sorteio: elencos fortes aparecem mais, mas zebra aparece.
function pesoElenco(adv) {
  return 0.35 + adv.percentil ** 1.5;
}

// Um elenco só serve se tem alguém que caiba (mesmo improvisando) em alguma vaga livre.
export function jogadoresUteis(draft, elenco) {
  const livres = FORMACOES[draft.formacao].map((v, i) => (draft.escalacao[i] ? null : v.pos));
  return elenco.js.filter((j) => !draft.usados.includes(j.id) && livres.some((p) => p && custoImproviso(j, p) != null));
}

export function rolar(draft, advs) {
  const rng = derivar(draft.semente, `rolagem:${draft.rolagem}`);
  const candidatos = advs.filter((a) => !draft.recentes.includes(a.elenco.id) && jogadoresUteis(draft, a.elenco).length);
  const escolhido = escolherPonderado(rng, candidatos, candidatos.map(pesoElenco));
  return {
    ...draft,
    atual: escolhido.elenco.id,
    rolagem: draft.rolagem + 1,
    recentes: [...draft.recentes, escolhido.elenco.id].slice(-8),
  };
}

// Re-sorteio por eixo: "selecao" mantém a Copa e troca o país; "copa" mantém o país (linhagem) e troca o ano.
export function resortear(draft, advs, eixo, selecoes) {
  if (draft.resorteiosRestantes <= 0 || !draft.atual) return draft;
  const atual = advs.find((a) => a.elenco.id === draft.atual).elenco;
  const rng = derivar(draft.semente, `resorteio:${draft.rolagem}:${draft.resorteiosRestantes}:${eixo}`);
  const linhagem = (sel) => selecoes[sel]?.linhagem ?? sel;
  let pool = advs.filter((a) => a.elenco.id !== atual.id && !draft.recentes.includes(a.elenco.id) && jogadoresUteis(draft, a.elenco).length);
  pool = eixo === "copa"
    ? pool.filter((a) => linhagem(a.elenco.sel) === linhagem(atual.sel))
    : pool.filter((a) => a.elenco.ano === atual.ano);
  if (!pool.length) return { ...draft, resorteiosRestantes: draft.resorteiosRestantes - 1 };
  const escolhido = escolherPonderado(rng, pool, pool.map(pesoElenco));
  return {
    ...draft,
    atual: escolhido.elenco.id,
    resorteiosRestantes: draft.resorteiosRestantes - 1,
    recentes: [...draft.recentes, escolhido.elenco.id].slice(-8),
  };
}

// Escala o jogador na vaga i. Devolve o draft novo (ou lança erro se não pode).
export function escalar(draft, jogador, i) {
  const vaga = FORMACOES[draft.formacao][i];
  if (!vaga || draft.escalacao[i]) throw new Error("vaga ocupada");
  if (draft.usados.includes(jogador.id)) throw new Error("jogador já escalado");
  if (custoImproviso(jogador, vaga.pos) == null) throw new Error(`${jogador.n} não joga de ${vaga.pos}`);
  const escalacao = draft.escalacao.slice();
  escalacao[i] = jogador;
  return {
    ...draft,
    escalacao,
    usados: [...draft.usados, jogador.id],
    elencosUsados: [...new Set([...draft.elencosUsados, `${jogador.ano}-${jogador.sel}`])],
    atual: null,
  };
}

// Trocar dois jogadores de vaga (ou mover para uma vaga vazia) depois de escalados.
export function trocar(draft, i, k) {
  const vagas = FORMACOES[draft.formacao];
  const a = draft.escalacao[i], b = draft.escalacao[k];
  if (a && custoImproviso(a, vagas[k].pos) == null) return draft;
  if (b && custoImproviso(b, vagas[i].pos) == null) return draft;
  const escalacao = draft.escalacao.slice();
  escalacao[i] = b; escalacao[k] = a;
  return { ...draft, escalacao };
}

// Mudar a formação no meio do draft: quem cabe nas novas vagas é realocado, o resto sai do time.
export function mudarFormacao(draft, formacao) {
  const vagas = FORMACOES[formacao];
  const escalados = draft.escalacao.filter(Boolean).sort((a, b) => a.pos.length - b.pos.length);
  const escalacao = vagas.map(() => null);
  for (const j of escalados) {
    let melhor = -1, custo = Infinity;
    vagas.forEach((v, i) => {
      if (escalacao[i]) return;
      const c = custoImproviso(j, v.pos);
      if (c != null && c < custo) { custo = c; melhor = i; }
    });
    if (melhor >= 0) escalacao[melhor] = j;
  }
  const usados = escalacao.filter(Boolean).map((j) => j.id);
  return { ...draft, formacao, escalacao, usados };
}

export const completo = (draft) => draft.escalacao.every(Boolean);

// Tirar um jogador do time (só no modo livre: no sorteio isso viraria pescaria de elencos).
export function remover(draft, i) {
  const j = draft.escalacao[i];
  if (!j) return draft;
  const escalacao = draft.escalacao.slice();
  escalacao[i] = null;
  const restantes = escalacao.filter(Boolean);
  return {
    ...draft,
    escalacao,
    usados: draft.usados.filter((id) => id !== j.id),
    elencosUsados: [...new Set(restantes.map((x) => `${x.ano}-${x.sel}`))],
  };
}
