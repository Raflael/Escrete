// Preço de cada jogador para os modos com orçamento: cresce muito mais rápido que a nota,
// para que um time só de craques não caiba e montar vire escolha.
export const ORCAMENTO = 1000;

export function preco(j) {
  const base = Math.max(0, j.f - 62) / 37;
  return Math.round(5 + 300 * base ** 2.6 * (j.l ? 1.15 : 1));
}

export const gasto = (escalacao) => escalacao.reduce((s, j) => s + (j ? preco(j) : 0), 0);
