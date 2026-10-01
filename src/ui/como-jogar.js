// Regras, em texto de jornal.
import { h } from "./util.js";

export function telaComoJogar(tela) {
  tela.append(h("article.copa",
    h("p.chapeu", "Manual do torcedor"),
    h("h2.manchete", "Como se joga o Escrete"),
    h("div.bloco", h("h2", "1 · O sorteio"),
      h("p", "Cada rodada sorteia uma seleção de uma Copa de verdade. Elencos fortes saem com mais frequência, mas a zebra aparece. Você escolhe um jogador daquele elenco e o encaixa numa vaga livre. Onze rodadas, onze jogadores."),
      h("p", "Não curtiu o sorteio? Use um re-sorteio: \"outra seleção\" mantém a Copa e troca o país; \"outra Copa\" mantém o país e troca o ano. São três no modo clássico.")),
    h("div.bloco", h("h2", "2 · As posições"),
      h("p", "Cada jogador tem as posições em que jogou naquela Copa. Na posição dele, rende a nota cheia. Numa posição vizinha — um lateral de zagueiro, um meia de ponta — ele improvisa e perde alguns pontos. Goleiro só joga no gol."),
      h("p", "Depois de escalado, toque no jogador para trocá-lo de lugar com outro.")),
    h("div.bloco", h("h2", "3 · A força do time"),
      h("p", "O ataque pesa mais os atacantes e meias; a defesa, os zagueiros, laterais e volantes; o goleiro conta à parte. Jogadores do mesmo elenco ganham entrosamento — um pequeno bônus que cresce quando você junta companheiros de vestiário."),
      h("p", "O estilo muda o ritmo: ofensivo faz e sofre mais gols; defensivo trava o jogo e empurra para os pênaltis.")),
    h("div.bloco", h("h2", "4 · A Copa"),
      h("p", "Três jogos de grupo (passam os dois primeiros), depois oitavas, quartas, semifinal e final. Os adversários são elencos reais, com a escalação mais forte que tinham, e ficam mais duros a cada fase. No mata-mata, empate leva à prorrogação e aos pênaltis, cobrança por cobrança.")),
    h("div.bloco", h("h2", "5 · As façanhas"),
      h("p", "Ser campeão é a meta. Ganhar os sete jogos (sem precisar de pênaltis) é o 7 em 7. E vencer os sete sem sofrer nenhum gol é o Escrete Perfeito — coisa para contar para os netos.")),
    h("div.bloco", h("h2", "6 · O modo almanaque"),
      h("p", "Para quem sabe de cor: as notas ficam escondidas e você escala só pelo nome, pela posição e pela memória. Um re-sorteio só.")),
    h("div.bloco", h("h2", "7 · O modo livre"),
      h("p", "Sem sorteio: busque qualquer jogador de qualquer Copa pelo nome, pela seleção, pelo ano ou pela posição — toque numa vaga vazia e a lista já filtra quem joga ali. Dá para tirar e trocar à vontade."),
      h("p", "Com um time só de lendas a Copa normal fica fácil, então escolha a dificuldade: na Lendária, só os maiores elencos da história aparecem pela frente. Quem quiser estratégia liga o teto de 1000: cada jogador tem preço pela nota, e onze lendas não cabem. Títulos do modo livre ficam contados à parte.")),
    h("a.acao.vermelha", { href: "#/jogar" }, "Montar meu time →")));
}
