// Pequenos utilitários de interface: criação de elementos, escudo, botão, nomes, armazenamento.

// h("div.classe#id", {atributos}, ...filhos) — filhos podem ser texto, nós, arrays ou null.
export function h(sel, attrs, ...filhos) {
  const [, tag = "div", resto = ""] = /^([a-z0-9]*)(.*)$/i.exec(sel);
  const el = document.createElement(tag || "div");
  for (const [, tipo, nome] of resto.matchAll(/([.#])([\w-]+)/g)) {
    if (tipo === ".") el.classList.add(nome); else el.id = nome;
  }
  if (attrs != null && (typeof attrs !== "object" || attrs instanceof Node || Array.isArray(attrs))) { filhos.unshift(attrs); attrs = null; }
  for (const [k, v] of Object.entries(attrs ?? {})) {
    if (v == null || v === false) continue;
    if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (k === "style" && typeof v === "object") {
      for (const [p, val] of Object.entries(v)) {
        if (p.startsWith("--")) el.style.setProperty(p, val); // variáveis CSS não entram por atribuição direta
        else el.style[p] = val;
      }
    }
    else if (k === "html") el.innerHTML = v;
    else el.setAttribute(k, v === true ? "" : v);
  }
  const por = (f) => {
    if (f == null || f === false) return;
    if (Array.isArray(f)) return f.forEach(por);
    el.append(f instanceof Node ? f : document.createTextNode(String(f)));
  };
  filhos.forEach(por);
  return el;
}

export const svg = (marcacao) => {
  const t = document.createElement("template");
  t.innerHTML = marcacao.trim();
  return t.content.firstChild;
};

// Escudo: brasão simples com as duas cores da camisa.
export function escudo(cores = ["#fff", "#222"], tamanho = 26) {
  const [c1, c2] = cores;
  return svg(`<svg class="escudo" viewBox="0 0 26 30" width="${tamanho}" height="${Math.round(tamanho * 30 / 26)}" aria-hidden="true">
    <path d="M13 1 L24 5 V14 C24 22 18.5 26.5 13 29 C7.5 26.5 2 22 2 14 V5 Z" fill="${c1}" stroke="#1f1a17" stroke-width="1.6"/>
    <path d="M13 1 L24 5 V14 C24 22 18.5 26.5 13 29 Z" fill="${c2}" opacity="0.95"/>
    <path d="M13 1 L24 5 V14 C24 22 18.5 26.5 13 29 C7.5 26.5 2 22 2 14 V5 Z" fill="none" stroke="#1f1a17" stroke-width="1.6"/>
  </svg>`);
}

// Futebol de botão com as cores da seleção do jogador e o número da camisa.
export function botao(jogador, cores) {
  const b = h("span.botao", { style: { "--c1": cores?.[0] ?? "#fff", "--c2": cores?.[1] ?? "#333" } },
    h("span.n", jogador.no ?? "·"));
  if (jogador.l) b.classList.add("lenda");
  return b;
}

// Nome curto para o campo: mantém nomes curtos e apelidos; senão fica com o sobrenome (com partícula).
const PARTICULAS = new Set(["de", "da", "do", "dos", "das", "van", "von", "der", "den", "di", "del", "la", "le", "el", "al", "ben", "mac", "st.", "'t"]);
export function nomeCurto(nome) {
  if (nome.length <= 15) return nome;
  const partes = nome.split(/\s+/);
  let i = partes.length - 1;
  while (i > 0 && PARTICULAS.has(partes[i - 1].toLowerCase())) i--;
  const sobrenome = partes.slice(i).join(" ");
  return sobrenome.length >= 4 ? sobrenome : nome;
}

export const POS_NOME = {
  GOL: "Goleiro", LD: "Lateral-dir.", ZAG: "Zagueiro", LE: "Lateral-esq.", VOL: "Volante", MC: "Meio-campo",
  MD: "Meia-dir.", ME: "Meia-esq.", MEI: "Meia-armador", PD: "Ponta-dir.", PE: "Ponta-esq.", CA: "Centroavante",
};

export const FASE_CAMPANHA = {
  campeao: "campeã", vice: "vice-campeã", terceiro: "semifinalista", semi: "semifinalista",
  quartas: "caiu nas quartas", mata: "caiu no mata-mata", grupos: "caiu na fase de grupos",
};

// Armazenamento local que nunca derruba a página (aba anônima, cota cheia, bloqueio).
export const guardado = {
  ler(chave, padrao) {
    try { const v = localStorage.getItem("escrete:" + chave); return v == null ? padrao : JSON.parse(v); } catch { return padrao; }
  },
  gravar(chave, valor) {
    try { localStorage.setItem("escrete:" + chave, JSON.stringify(valor)); } catch { /* sem armazenamento: segue sem memória */ }
  },
};

export const sementeNova = () => Math.random().toString(36).slice(2, 10);
export const espera = (ms) => new Promise((r) => setTimeout(r, ms));

// replaceChildren que ignora null/false (o nativo escreveria "null" na tela).
export const preencher = (el, ...filhos) => el.replaceChildren(...filhos.flat().filter((x) => x != null && x !== false));
export const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
