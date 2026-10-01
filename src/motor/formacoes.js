// Posições, formações e o quanto cada posição pesa no ataque e na defesa.

export const POSICOES = {
  GOL: { nome: "Goleiro", setor: "gol" },
  LD: { nome: "Lateral-direito", setor: "def" },
  ZAG: { nome: "Zagueiro", setor: "def" },
  LE: { nome: "Lateral-esquerdo", setor: "def" },
  VOL: { nome: "Volante", setor: "mei" },
  MC: { nome: "Meio-campista", setor: "mei" },
  MD: { nome: "Meia-direita", setor: "mei" },
  ME: { nome: "Meia-esquerda", setor: "mei" },
  MEI: { nome: "Meia-armador", setor: "mei" },
  PD: { nome: "Ponta-direita", setor: "ata" },
  PE: { nome: "Ponta-esquerda", setor: "ata" },
  CA: { nome: "Centroavante", setor: "ata" },
};

// Quanto cada vaga contribui para criar gols (ataque) e para evitar (defesa).
// O goleiro fica fora das duas médias: ele entra à parte, como fator sobre os gols sofridos.
export const PESO = {
  LD: { atk: 0.15, def: 1 }, LE: { atk: 0.15, def: 1 }, ZAG: { atk: 0.05, def: 1.1 },
  VOL: { atk: 0.25, def: 0.85 }, MC: { atk: 0.55, def: 0.55 },
  MD: { atk: 0.6, def: 0.4 }, ME: { atk: 0.6, def: 0.4 }, MEI: { atk: 0.85, def: 0.2 },
  PD: { atk: 1, def: 0.1 }, PE: { atk: 1, def: 0.1 }, CA: { atk: 1.1, def: 0.05 },
};

// Improviso: jogar fora da posição de origem custa pontos de força.
// Só vale entre posições vizinhas; o resto não é permitido.
const VIZINHAS = {
  LD: { MD: 3, ZAG: 4, LE: 5 }, LE: { ME: 3, ZAG: 4, LD: 5 },
  ZAG: { VOL: 4, LD: 5, LE: 5 },
  VOL: { MC: 2, ZAG: 5 }, MC: { VOL: 2, MEI: 3, MD: 4, ME: 4 },
  MD: { PD: 3, MC: 4, LD: 4, ME: 5 }, ME: { PE: 3, MC: 4, LE: 4, MD: 5 },
  MEI: { MC: 3, CA: 5, MD: 5, ME: 5 },
  PD: { MD: 3, PE: 3, CA: 5 }, PE: { ME: 3, PD: 3, CA: 5 },
  CA: { PD: 5, PE: 5, MEI: 5 },
};

// Custo de um jogador ocupar a vaga `vaga`: 0 se é posição dele, n se improvisa, null se não pode.
export function custoImproviso(jogador, vaga) {
  if (jogador.pos.includes(vaga)) return 0;
  if (vaga === "GOL" || jogador.pos.includes("GOL")) return null;
  let melhor = null;
  for (const p of jogador.pos) {
    const c = VIZINHAS[p]?.[vaga];
    if (c != null && (melhor == null || c < melhor)) melhor = c;
  }
  return melhor;
}

export const forcaNaVaga = (jogador, vaga) => {
  const c = custoImproviso(jogador, vaga);
  return c == null ? null : jogador.f - c;
};

// Vagas por formação. x: 0 (esquerda) a 100 (direita); y: 0 (gol adversário) a 100 (nosso gol).
const v = (pos, x, y) => ({ pos, x, y });
export const FORMACOES = {
  "4-3-3": [v("GOL", 50, 92), v("LD", 84, 72), v("ZAG", 62, 76), v("ZAG", 38, 76), v("LE", 16, 72),
    v("VOL", 50, 58), v("MC", 70, 48), v("MEI", 30, 48), v("PD", 82, 22), v("CA", 50, 16), v("PE", 18, 22)],
  "4-4-2": [v("GOL", 50, 92), v("LD", 84, 73), v("ZAG", 62, 77), v("ZAG", 38, 77), v("LE", 16, 73),
    v("MD", 84, 50), v("VOL", 60, 54), v("MC", 40, 54), v("ME", 16, 50), v("CA", 62, 20), v("CA", 38, 20)],
  "4-2-3-1": [v("GOL", 50, 92), v("LD", 84, 73), v("ZAG", 62, 77), v("ZAG", 38, 77), v("LE", 16, 73),
    v("VOL", 62, 60), v("VOL", 38, 60), v("PD", 82, 38), v("MEI", 50, 40), v("PE", 18, 38), v("CA", 50, 16)],
  "4-2-4": [v("GOL", 50, 92), v("LD", 84, 73), v("ZAG", 62, 77), v("ZAG", 38, 77), v("LE", 16, 73),
    v("VOL", 62, 55), v("MEI", 38, 50), v("PD", 86, 24), v("CA", 60, 18), v("CA", 40, 18), v("PE", 14, 24)],
  "4-1-2-1-2": [v("GOL", 50, 92), v("LD", 84, 73), v("ZAG", 62, 77), v("ZAG", 38, 77), v("LE", 16, 73),
    v("VOL", 50, 62), v("MC", 72, 50), v("MC", 28, 50), v("MEI", 50, 38), v("CA", 62, 18), v("CA", 38, 18)],
  "3-5-2": [v("GOL", 50, 92), v("ZAG", 72, 77), v("ZAG", 50, 79), v("ZAG", 28, 77),
    v("MD", 88, 50), v("VOL", 50, 60), v("MC", 68, 46), v("MEI", 32, 46), v("ME", 12, 50), v("CA", 62, 18), v("CA", 38, 18)],
  "3-4-3": [v("GOL", 50, 92), v("ZAG", 72, 77), v("ZAG", 50, 79), v("ZAG", 28, 77),
    v("MD", 86, 52), v("VOL", 60, 56), v("MC", 40, 56), v("ME", 14, 52), v("PD", 80, 24), v("CA", 50, 16), v("PE", 20, 24)],
  "5-3-2": [v("GOL", 50, 92), v("LD", 88, 66), v("ZAG", 70, 77), v("ZAG", 50, 79), v("ZAG", 30, 77), v("LE", 12, 66),
    v("VOL", 50, 56), v("MC", 72, 48), v("MEI", 28, 48), v("CA", 62, 20), v("CA", 38, 20)],
  "4-5-1": [v("GOL", 50, 92), v("LD", 84, 73), v("ZAG", 62, 77), v("ZAG", 38, 77), v("LE", 16, 73),
    v("MD", 86, 46), v("VOL", 62, 58), v("VOL", 38, 58), v("ME", 14, 46), v("MEI", 50, 40), v("CA", 50, 16)],
  // O WM dos anos 50: três zagueiros, dois médios, dois meias recuados e três na frente.
  "WM": [v("GOL", 50, 92), v("ZAG", 72, 76), v("ZAG", 50, 78), v("ZAG", 28, 76),
    v("VOL", 64, 58), v("VOL", 36, 58), v("MEI", 66, 40), v("MEI", 34, 40), v("PD", 86, 20), v("CA", 50, 16), v("PE", 14, 20)],
};

// Estilo não troca as vagas: muda o ritmo do jogo. Ofensivo faz e sofre mais; defensivo trava o placar.
export const ESTILOS = {
  ofensivo: { nome: "Ofensivo", marca: 1.14, sofre: 1.12 },
  equilibrado: { nome: "Equilibrado", marca: 1, sofre: 1 },
  defensivo: { nome: "Defensivo", marca: 0.84, sofre: 0.82 },
};
