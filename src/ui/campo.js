// O campo desenhado, com as vagas da formação e os botões dos jogadores escalados.
import { FORMACOES, forcaNaVaga, custoImproviso } from "../motor/formacoes.js";
import { h, svg, botao, nomeCurto } from "./util.js";

const LINHAS = `<svg class="linhas" viewBox="0 0 300 400" preserveAspectRatio="none" aria-hidden="true">
  <rect x="8" y="8" width="284" height="384"/>
  <line x1="8" y1="200" x2="292" y2="200"/>
  <circle cx="150" cy="200" r="40"/>
  <rect x="70" y="8" width="160" height="62"/><rect x="112" y="8" width="76" height="24"/>
  <path d="M116 70 A40 40 0 0 0 184 70"/>
  <rect x="70" y="330" width="160" height="62"/><rect x="112" y="368" width="76" height="24"/>
  <path d="M116 330 A40 40 0 0 1 184 330"/>
</svg>`;

// opcoes: { formacao, escalacao, selecoes, ocultarForca, alvos:Set<i>, alvosTroca:Set<i>, selecionada:i, aoClicar(i) }
export function campo(op) {
  const vagas = FORMACOES[op.formacao];
  const el = h("div.campo", { role: "group", "aria-label": `Campo, formação ${op.formacao}` }, svg(LINHAS));
  vagas.forEach((v, i) => {
    const j = op.escalacao[i];
    const classes = ["vaga"];
    if (op.alvos?.has(i)) classes.push("alvo");
    if (op.alvosTroca?.has(i)) classes.push("alvo-troca");
    if (op.selecionada === i) classes.push("selecionada");
    let conteudo;
    if (j) {
      const f = forcaNaVaga(j, v.pos);
      const improviso = custoImproviso(j, v.pos) > 0;
      conteudo = [
        botao(j, op.selecoes[j.sel]?.cores),
        h("span.rotulo", nomeCurto(j.n)),
        h("span.forca-vaga" + (improviso ? ".improviso" : ""),
          op.ocultarForca ? v.pos : `${v.pos} · ${f}${improviso ? " (improv.)" : ""}`),
      ];
    } else {
      conteudo = [h("span.vaga-vazia", v.pos)];
    }
    const rotulo = j ? `${v.pos}: ${j.n}` : `${v.pos}: vaga livre`;
    const tag = op.aoClicar ? "button" : "div";
    el.append(h(`${tag}.${classes.join(".")}`, {
      style: { left: `${v.x}%`, top: `${v.y}%` },
      type: op.aoClicar ? "button" : null,
      "aria-label": rotulo,
      onclick: op.aoClicar ? () => op.aoClicar(i) : null,
    }, conteudo));
  });
  return el;
}
