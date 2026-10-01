// Capa do jornal: a proposta do jogo, os números do acervo e um escrete lendário sorteado.
import { h } from "./util.js";
import { campo } from "./campo.js";
import { melhorEscalacao } from "../motor/time.js";
import { embaralhar, criarRng } from "../motor/rng.js";

export function telaCapa(tela, { dados, totalJogadores }) {
  const copas = new Set(dados.elencos.map((e) => e.ano)).size;
  const selecoes = Object.keys(dados.selecoes).length;

  // Um time de lendas diferente a cada visita: embaralha as lendas e escala o melhor que couber.
  const lendas = [];
  const vistos = new Set();
  for (const e of dados.elencos) for (const j of e.js) if (j.l && !vistos.has(j.id)) { vistos.add(j.id); lendas.push(j); }
  const amostra = embaralhar(criarRng(String(Date.now())), lendas).slice(0, 40);
  const escalacao = melhorEscalacao("4-3-3", amostra);

  tela.append(h("section.capa",
    h("div",
      h("p.chapeu", "Edição extra · Copa dos sonhos"),
      h("h2.capa-manchete", "Sorteie a Copa. Escale o craque. Dispute o título."),
      h("p.capa-linha-fina",
        "A cada rodada sai uma seleção de verdade, de uma Copa de verdade — Brasil de 1958, Hungria de 1954, Holanda de 1974. ",
        "Você escolhe um jogador daquele elenco para o seu time. Com os onze escalados, o seu escrete disputa uma Copa inteira contra seleções históricas, gol a gol."),
      h("div.capa-acoes",
        h("a.acao.vermelha", { href: "#/jogar" }, "Montar meu time →"),
        h("a.acao.secundaria", { href: "#/livre" }, "Modo livre"),
        h("a.acao.secundaria", { href: "#/como-jogar" }, "Como se joga")),
      h("div.numeros",
        h("div", h("b", copas), h("span.versalete", "Copas")),
        h("div", h("b", selecoes), h("span.versalete", "seleções")),
        h("div", h("b", dados.elencos.length), h("span.versalete", "elencos")),
        h("div", h("b", totalJogadores.toLocaleString("pt-BR")), h("span.versalete", "convocados"))),
      h("div.capa-colunas",
        h("p", "Cada jogador aparece na seleção e no ano em que foi convocado — o Pelé de 1958 tem 17 anos, o de 1970 é o rei. ",
          "Titulares, reservas e até quem nunca entrou em campo: todo mundo que esteve naquela lista."),
        h("p", "A nota de cada um mede o que ele jogou naquela Copa, não a carreira inteira. Lendas ganham a estrela dourada."),
        h("p", "Os adversários também são reais: o seu time enfrenta elencos inteiros, com a escalação mais forte que eles tinham. ",
          "No mata-mata, empate vai para a prorrogação e para os pênaltis, cobrança por cobrança."),
        h("p", "A façanha máxima: sete jogos, sete vitórias e nenhum gol sofrido."))),
    h("div",
      h("p.versalete.suave", { style: { textAlign: "center", margin: "0 0 6px" } }, "Um escrete de lendas, sorteado agora"),
      campo({ formacao: "4-3-3", escalacao, selecoes: dados.selecoes, ocultarForca: false }),
      h("p.dica", { style: { textAlign: "center" } }, "Recarregue a página para outro time dos sonhos."))));
}
