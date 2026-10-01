// Leitura de wikitext: templates com parâmetros aninhados e limpeza de links.

// Acha todos os templates {{...}} de nível superior cujo nome casa com `re`,
// devolvendo { nome, params, inicio }. Respeita {{ }} e [[ ]] aninhados.
export function templates(texto, re) {
  const achados = [];
  for (let i = texto.indexOf("{{"); i !== -1; i = texto.indexOf("{{", i + 2)) {
    const fim = fechamento(texto, i);
    if (fim === -1) break;
    const corpo = texto.slice(i + 2, fim);
    const partes = dividir(corpo);
    const nome = partes[0].trim();
    if (re.test(nome)) {
      const params = {};
      partes.slice(1).forEach((p, k) => {
        const eq = p.indexOf("=");
        if (eq === -1) params[k + 1] = p.trim();
        else params[p.slice(0, eq).trim()] = p.slice(eq + 1).trim();
      });
      achados.push({ nome, params, inicio: i });
      i = fim; // não entra nos templates internos
    }
  }
  return achados;
}

function fechamento(t, i) {
  let prof = 0;
  for (let k = i; k < t.length - 1; k++) {
    if (t[k] === "{" && t[k + 1] === "{") { prof++; k++; }
    else if (t[k] === "}" && t[k + 1] === "}") { prof--; k++; if (prof === 0) return k - 1; }
  }
  return -1;
}

// Divide por "|" só no nível zero de {{ }} e [[ ]].
function dividir(corpo) {
  const partes = [];
  let chave = 0, colchete = 0, ini = 0;
  for (let k = 0; k < corpo.length; k++) {
    const a = corpo[k], b = corpo[k + 1];
    if (a === "{" && b === "{") { chave++; k++; }
    else if (a === "}" && b === "}") { chave--; k++; }
    else if (a === "[" && b === "[") { colchete++; k++; }
    else if (a === "]" && b === "]") { colchete--; k++; }
    else if (a === "|" && chave === 0 && colchete === 0) { partes.push(corpo.slice(ini, k)); ini = k + 1; }
  }
  partes.push(corpo.slice(ini));
  return partes;
}

// Primeiro link [[Alvo|Texto]] de um trecho -> { alvo, texto }.
export function link(s) {
  const m = /\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]+))?\]\]/.exec(s ?? "");
  if (!m) return null;
  return { alvo: m[1].trim(), texto: (m[2] ?? m[1]).trim() };
}

// Texto visível: tira links, templates, refs, marcação.
export function limpo(s) {
  return (s ?? "")
    .replace(/<ref[^>]*\/>/g, "")
    .replace(/<ref[\s\S]*?<\/ref>/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\{\{[^{}]*\}\}/g, "")
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, "$1")
    .replace(/'{2,}/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Cabeçalho de seção (== X ==, === X ===...) mais próximo antes da posição `pos`.
export function secaoAntes(texto, pos, nivelMin = 3, nivelMax = 5) {
  const re = /^(={2,5})\s*([^=\n]+?)\s*\1\s*$/gm;
  let ultima = null, m;
  while ((m = re.exec(texto)) && m.index < pos) if (m[1].length >= nivelMin && m[1].length <= nivelMax) ultima = limpo(m[2]);
  return ultima;
}
