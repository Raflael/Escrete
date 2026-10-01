// Entrada: carrega os elencos, prepara os adversários e troca de tela conforme o endereço (#/...).
import { prepararAdversarios } from "./motor/copa.js";
import { telaCapa } from "./ui/capa.js";
import { telaDraft } from "./ui/draft-tela.js";
import { telaLivre } from "./ui/livre-tela.js";
import { telaCopa } from "./ui/copa-tela.js";
import { telaHistorico } from "./ui/historico.js";
import { telaComoJogar } from "./ui/como-jogar.js";

const tela = document.getElementById("tela");
document.getElementById("data-hoje").textContent = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

let contexto = null; // { dados, advs, porId }
async function carregar() {
  if (contexto) return contexto;
  const r = await fetch("dados/jogo/elencos.json");
  if (!r.ok) throw new Error(`não consegui ler os elencos (HTTP ${r.status})`);
  const dados = await r.json();
  const advs = prepararAdversarios(dados);
  const porId = new Map(advs.map((a) => [a.elenco.id, a]));
  const totalJogadores = dados.elencos.reduce((s, e) => s + e.js.length, 0);
  contexto = { dados, advs, porId, totalJogadores };
  return contexto;
}

const ROTAS = {
  "": telaCapa,
  "jogar": telaDraft,
  "livre": telaLivre,
  "copa": telaCopa,
  "historico": telaHistorico,
  "como-jogar": telaComoJogar,
};

async function rotear() {
  const [rota, ...args] = location.hash.replace(/^#\/?/, "").split("/");
  const fn = ROTAS[rota] ?? telaCapa;
  document.querySelectorAll(".menu a").forEach((a) => {
    a.toggleAttribute("aria-current", a.getAttribute("href") === `#/${rota}`);
    if (a.hasAttribute("aria-current")) a.setAttribute("aria-current", "page");
  });
  try {
    const ctx = await carregar();
    tela.replaceChildren();
    await fn(tela, ctx, args);
    window.scrollTo({ top: 0 });
  } catch (e) {
    console.error(e);
    tela.replaceChildren(Object.assign(document.createElement("p"), { className: "aviso", textContent: "Deu erro na gráfica: " + e.message }));
  }
}
window.addEventListener("hashchange", rotear);
rotear();
