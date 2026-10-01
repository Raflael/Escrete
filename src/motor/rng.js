// Aleatoriedade com semente: a mesma semente produz a mesma Copa, gol a gol.
// É o que permite o desafio do dia ser igual para todo mundo e um resultado ser reproduzido pelo link.

// Hash de texto -> inteiro de 32 bits (FNV-1a).
export function hash(texto) {
  let h = 0x811c9dc5;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// Gerador sfc32 (rápido, bom o bastante para jogo), semeado por texto.
export function criarRng(semente) {
  let a = hash(semente + "#a"), b = hash(semente + "#b"), c = hash(semente + "#c"), d = hash(semente + "#d");
  const rng = () => {
    a |= 0; b |= 0; c |= 0; d |= 0;
    const t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
  for (let i = 0; i < 12; i++) rng(); // descarta o começo, que ainda carrega a semente crua
  return rng;
}

// Sub-gerador independente para um propósito ("gols", "sorteio:3"...), para que mexer
// numa parte do jogo não altere o sorteio das outras.
export const derivar = (semente, rotulo) => criarRng(semente + "/" + rotulo);

export function escolher(rng, lista) {
  if (!lista.length) throw new Error("escolher: lista vazia");
  return lista[Math.floor(rng() * lista.length)];
}

export function escolherPonderado(rng, lista, pesos) {
  const total = pesos.reduce((s, p) => s + p, 0);
  if (!(total > 0)) return escolher(rng, lista);
  let x = rng() * total;
  for (let i = 0; i < lista.length; i++) if ((x -= pesos[i]) <= 0) return lista[i];
  return lista[lista.length - 1];
}

// Poisson por multiplicação de uniformes (Knuth) — lambdas daqui são pequenos, é suficiente.
export function poisson(rng, lambda) {
  if (lambda <= 0) return 0;
  const limite = Math.exp(-lambda);
  let k = 0, p = 1;
  do { k++; p *= rng(); } while (p > limite);
  return k - 1;
}

export function embaralhar(rng, lista) {
  const a = lista.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
