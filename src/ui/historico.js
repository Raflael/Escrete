// Minhas Copas: as campanhas guardadas neste aparelho.
import { h, guardado } from "./util.js";

export function telaHistorico(tela) {
  const tudo = guardado.ler("historico", []);
  // Os números de cima contam só o sorteio (clássico e almanaque); o modo livre fica à parte.
  const hist = tudo.filter((c) => c.modo !== "livre");
  const livres = tudo.filter((c) => c.modo === "livre");
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
      h("div", h("b", escretes), h("span.versalete", "escretes perfeitos")),
      h("div", h("b", `${livres.filter((c) => c.campeao).length}/${livres.length}`), h("span.versalete", "títulos no modo livre"))),
    tudo.length
      ? h("table.tabela",
        h("thead", h("tr", h("th", "Quando"), h("th", "Modo"), h("th", "Time"), h("th", "Até onde"), h("th.n", "Gols"), h("th.n", "Nota"))),
        h("tbody", tudo.map((c) => h("tr" + (c.campeao ? ".eu" : ""),
          h("td", new Date(c.quando).toLocaleDateString("pt-BR")),
          h("td", c.modo === "livre" ? `Livre${c.dificuldade && c.dificuldade !== "normal" ? " · " + ({ dificil: "difícil", lendaria: "lendária" })[c.dificuldade] : ""}` : c.modo === "almanaque" ? "Almanaque" : "Sorteio"),
          h("td", h("span", { title: c.time.join(", ") }, `${c.formacao} · ${c.time.slice(0, 3).join(", ")}…`)),
          h("td", c.alcance + (c.setePerfeito && c.campeao ? " ★" : "")),
          h("td.n", `${c.gp}–${c.gc}`),
          h("td.n", c.nota)))))
      : h("p.aviso", "Nenhuma Copa disputada ainda neste aparelho."),
    h("p.dica", "O histórico fica guardado só neste navegador.")));
}
