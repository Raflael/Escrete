// Minhas Copas: as campanhas guardadas neste aparelho.
import { h, guardado } from "./util.js";

export function telaHistorico(tela) {
  const hist = guardado.ler("historico", []);
  const titulos = hist.filter((c) => c.campeao).length;
  const perfeitas = hist.filter((c) => c.campeao && c.setePerfeito).length;
  const escretes = hist.filter((c) => c.campeao && c.setePerfeito && c.semSofrer).length;
  tela.append(h("div.copa",
    h("p.chapeu", "Arquivo"),
    h("h2.manchete", "Minhas Copas"),
    h("div.numeros",
      h("div", h("b", hist.length), h("span.versalete", "Copas disputadas")),
      h("div", h("b", titulos), h("span.versalete", "títulos")),
      h("div", h("b", perfeitas), h("span.versalete", "7 em 7")),
      h("div", h("b", escretes), h("span.versalete", "escretes perfeitos"))),
    hist.length
      ? h("table.tabela",
        h("thead", h("tr", h("th", "Quando"), h("th", "Time"), h("th", "Até onde"), h("th.n", "Gols"), h("th.n", "Nota"))),
        h("tbody", hist.map((c) => h("tr" + (c.campeao ? ".eu" : ""),
          h("td", new Date(c.quando).toLocaleDateString("pt-BR")),
          h("td", h("span", { title: c.time.join(", ") }, `${c.formacao} · ${c.time.slice(0, 3).join(", ")}…`)),
          h("td", c.alcance + (c.setePerfeito && c.campeao ? " ★" : "")),
          h("td.n", `${c.gp}–${c.gc}`),
          h("td.n", c.nota)))))
      : h("p.aviso", "Nenhuma Copa disputada ainda neste aparelho."),
    h("p.dica", "O histórico fica guardado só neste navegador.")));
}
