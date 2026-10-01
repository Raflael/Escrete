// Tela de montagem: sortear elenco, escolher jogador, encaixar no campo, trocar de posição.
import { FORMACOES, ESTILOS, custoImproviso, forcaNaVaga } from "../motor/formacoes.js";
import { novoDraft, rolar, resortear, escalar, trocar, mudarFormacao, jogadoresUteis, completo, MODOS } from "../motor/draft.js";
import { avaliarTime } from "../motor/time.js";
import { h, escudo, POS_NOME, FASE_CAMPANHA, guardado, sementeNova, espera } from "./util.js";
import { campo } from "./campo.js";
import { passagem } from "./passagem.js";

// ---------- salvar e restaurar o draft em andamento ----------
function salvar(d) {
  guardado.gravar("draft", {
    ...d,
    escalacao: d.escalacao.map((j) => (j ? `${j.ano}-${j.sel}|${j.id}` : null)),
  });
}
function restaurar(porId) {
  const s = guardado.ler("draft", null);
  if (!s?.escalacao) return null;
  try {
    const escalacao = s.escalacao.map((k) => {
      if (!k) return null;
      const [idElenco, idJogador] = k.split("|");
      const j = porId.get(idElenco)?.elenco.js.find((x) => x.id === idJogador);
      if (!j) throw new Error("jogador sumiu dos dados");
      return j;
    });
    if (!FORMACOES[s.formacao] || escalacao.length !== FORMACOES[s.formacao].length) return null;
    return { ...s, escalacao };
  } catch {
    return null;
  }
}

// ---------- letreiro que gira como painel de aeroporto ----------
const LETRAS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const celulas = (texto) => texto.toUpperCase().split("").map((c) => h("span.ch" + (c === " " ? ".espaco" : ""), c));
async function girarLetreiro(el, texto) {
  const alvo = texto.toUpperCase().split("");
  const celulas = alvo.map((c) => h("span.ch" + (c === " " ? ".espaco" : ""), c === " " ? " " : "·"));
  el.replaceChildren(...celulas);
  const reduzido = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const passos = reduzido ? 1 : 16;
  for (let p = 0; p < passos; p++) {
    celulas.forEach((c, i) => {
      if (alvo[i] === " ") return;
      const assenta = p >= passos - 1 || p > 6 + i * 0.5;
      c.textContent = assenta ? alvo[i] : LETRAS[Math.floor(Math.random() * LETRAS.length)];
    });
    await espera(45);
  }
  celulas.forEach((c, i) => (c.textContent = alvo[i] === " " ? " " : alvo[i]));
}

export function telaDraft(tela, ctx) {
  const { dados, advs, porId } = ctx;
  const sel = dados.selecoes;
  let d = restaurar(porId) ?? novoDraft({ semente: sementeNova() });
  let escolhido = null;   // jogador tocado na lista, esperando uma vaga
  let trocaDe = null;     // vaga tocada no campo, esperando outra para trocar
  let girando = false;
  const oculto = () => !MODOS[d.modo].forcaVisivel;

  const elencoAtual = () => (d.atual ? porId.get(d.atual)?.elenco : null);

  function mudar(novo) {
    d = novo;
    salvar(d);
    render();
  }

  // Vagas livres onde o jogador cabe, com o custo de improviso de cada uma.
  function vagasPara(j) {
    return FORMACOES[d.formacao]
      .map((v, i) => ({ i, custo: d.escalacao[i] ? null : custoImproviso(j, v.pos) }))
      .filter((x) => x.custo != null);
  }

  function tocarJogador(j) {
    if (escolhido?.id === j.id) { escolhido = null; return render(); }
    trocaDe = null;
    const vagas = vagasPara(j);
    const naturais = vagas.filter((v) => v.custo === 0);
    // Uma única vaga natural livre: escala direto, sem perguntar.
    if (naturais.length === 1 && vagas.length === 1) return colocar(j, naturais[0].i);
    escolhido = j;
    render();
  }

  function colocar(j, i) {
    escolhido = null;
    mudar(escalar(d, j, i));
  }

  function tocarVaga(i) {
    if (escolhido) {
      if (!d.escalacao[i] && custoImproviso(escolhido, FORMACOES[d.formacao][i].pos) != null) return colocar(escolhido, i);
      return;
    }
    if (trocaDe === i) { trocaDe = null; return render(); }
    if (trocaDe != null) {
      const antes = d.escalacao;
      const novo = trocar(d, trocaDe, i);
      trocaDe = null;
      if (novo.escalacao === antes) return render();
      return mudar(novo);
    }
    if (d.escalacao[i]) { trocaDe = i; render(); }
  }

  function alvosTroca() {
    if (trocaDe == null) return null;
    const vagas = FORMACOES[d.formacao];
    const a = d.escalacao[trocaDe];
    const s = new Set();
    vagas.forEach((v, i) => {
      if (i === trocaDe) return;
      const b = d.escalacao[i];
      if (custoImproviso(a, v.pos) == null) return;
      if (b && custoImproviso(b, vagas[trocaDe].pos) == null) return;
      s.add(i);
    });
    return s;
  }

  async function sortear(eixo) {
    if (girando) return;
    girando = true;
    escolhido = null; trocaDe = null;
    d = eixo ? resortear(d, advs, eixo, sel) : rolar(d, advs);
    salvar(d);
    render();
    const el = elencoAtual();
    const letreiro = tela.querySelector(".letreiro");
    if (letreiro && el) await girarLetreiro(letreiro, `${sel[el.sel].nome} ${el.ano}`);
    girando = false;
    render();
  }

  function recomecar() {
    if (d.escalacao.some(Boolean) && !confirm("Recomeçar do zero? O time atual vai para o vestiário.")) return;
    escolhido = null; trocaDe = null;
    mudar(novoDraft({ semente: sementeNova(), formacao: d.formacao, estilo: d.estilo, modo: d.modo }));
  }

  function trocarFormacao(f) {
    if (f === d.formacao) return;
    const novo = mudarFormacao(d, f);
    const saem = d.escalacao.filter(Boolean).length - novo.escalacao.filter(Boolean).length;
    if (saem > 0 && !confirm(`Na ${f}, ${saem} jogador(es) não encontram vaga e saem do time. Mudar mesmo assim?`)) return;
    escolhido = null; trocaDe = null;
    mudar(novo);
  }

  function disputar() {
    passagem.time = { ...d, nome: guardado.ler("nome-time", "Meu Escrete") };
    guardado.gravar("time-pronto", salvarTimePronto(d));
    location.hash = "#/copa";
  }

  // ---------- partes da tela ----------
  function painel() {
    const av = avaliarTime(d.formacao, d.escalacao);
    const escalados = d.escalacao.filter(Boolean).length;
    const esconder = oculto() && !completo(d);
    const valor = (x) => (esconder ? "?" : escalados ? Math.round(x) : "–");
    const comecou = escalados > 0 || d.atual;
    return h("aside.painel",
      h("div.bloco",
        h("h2", "Formação"),
        h("div.opcoes", Object.keys(FORMACOES).map((f) =>
          h("button.opcao", { type: "button", "aria-pressed": String(f === d.formacao), onclick: () => trocarFormacao(f) }, f)))),
      h("div.bloco",
        h("h2", "Estilo de jogo"),
        h("div.opcoes", Object.entries(ESTILOS).map(([k, e]) =>
          h("button.opcao", { type: "button", "aria-pressed": String(k === d.estilo), onclick: () => mudar({ ...d, estilo: k }) }, e.nome))),
        h("p.dica", d.estilo === "ofensivo" ? "Faz mais gols e sofre mais. Placar aberto." :
          d.estilo === "defensivo" ? "Tranca o jogo: menos gols pros dois lados, mais pênaltis." : "Nem lá, nem cá.")),
      h("div.bloco",
        h("h2", "Modo"),
        h("div.opcoes", Object.entries(MODOS).map(([k, m]) =>
          h("button.opcao", {
            type: "button", "aria-pressed": String(k === d.modo), disabled: comecou && k !== d.modo,
            onclick: () => mudar({ ...novoDraft({ semente: d.semente, formacao: d.formacao, estilo: d.estilo, modo: k }) }),
          }, m.nome))),
        h("p.dica", d.modo === "almanaque"
          ? "Às cegas: sem ver as notas, só nome, posição e memória. Um re-sorteio só."
          : "Notas à mostra e três re-sorteios.")),
      h("div.bloco",
        h("h2", `Seu time · ${escalados}/11`),
        h("div.placar-time",
          h("div", h("b", valor(av.geral)), h("span", "Geral")),
          h("div", h("b", valor(av.ataque)), h("span", "Ataque")),
          h("div", h("b", valor(av.defesa)), h("span", "Defesa")),
          h("div", h("b", esconder ? "?" : escalados ? (av.goleiro ? Math.round(av.goleiro) : "–") : "–"), h("span", "Goleiro"))),
        h("p.dica", `Entrosamento: +${esconder ? "?" : av.entrosamento.toFixed(1)}. Jogadores do mesmo elenco se entendem melhor.`),
        h("div.linha-acoes", h("button.acao.secundaria.pequena", { type: "button", onclick: recomecar }, "Recomeçar"))));
  }

  function centro() {
    const alvos = escolhido ? new Set(vagasPara(escolhido).map((v) => v.i)) : null;
    let dica = "Toque num jogador escalado para trocá-lo de posição.";
    if (escolhido) dica = `Escolha a vaga de ${escolhido.n}. Vagas com borda amarela aceitam — fora da posição dele, joga com nota menor.`;
    if (trocaDe != null) dica = "Toque na vaga de destino (amarela) ou no mesmo jogador para cancelar.";
    return h("section",
      campo({
        formacao: d.formacao, escalacao: d.escalacao, selecoes: sel, ocultarForca: oculto(),
        alvos, alvosTroca: alvosTroca(), selecionada: trocaDe, aoClicar: tocarVaga,
      }),
      h("p.dica", { style: { textAlign: "center" } }, dica));
  }

  function lado() {
    if (completo(d)) {
      const av = avaliarTime(d.formacao, d.escalacao);
      return h("aside",
        h("div.sorteio",
          h("p.chapeu", "Time fechado"),
          h("p.letreiro", celulas("11 escalados")),
          h("p", `Nota geral ${Math.round(av.geral)} · ${ESTILOS[d.estilo].nome} · ${d.formacao}`),
          h("p.dica", "Ainda dá para trocar jogadores de posição, mudar a formação ou o estilo."),
          h("div.linha-acoes", h("button.acao.vermelha", { type: "button", onclick: disputar }, "Disputar a Copa →"))));
    }
    const el = elencoAtual();
    if (!el) {
      return h("aside",
        h("div.sorteio",
          h("p.chapeu", `Rodada ${d.escalacao.filter(Boolean).length + 1} de 11`),
          h("p.letreiro", celulas("Sorteio")),
          h("p", "Sai uma seleção e uma Copa. Você leva um jogador daquele elenco."),
          h("div.linha-acoes", h("button.acao.vermelha", { type: "button", onclick: () => sortear(), disabled: girando }, "Sortear ⟳"))));
    }
    const uteis = new Set(jogadoresUteis(d, el).map((j) => j.id));
    const campanha = FASE_CAMPANHA[el.camp?.fase] ?? "";
    return h("aside",
      h("div.sorteio",
        girando ? h("p.letreiro") : h("div.cabeca-elenco", escudo(sel[el.sel].cores, 30), h("h2", `${sel[el.sel].nome} ${el.ano}`)),
        h("p.campanha", girando ? " " : `Nessa Copa, ${campanha}${el.camp ? ` · ${el.camp.v}V ${el.camp.e}E ${el.camp.d}D` : ""}.`),
        girando ? null : h("ul.lista-elenco", el.js.map((j) => {
          const pode = uteis.has(j.id);
          const jaUsado = d.usados.includes(j.id);
          return h("li", h("button.jogador", {
            type: "button", disabled: !pode, "aria-pressed": String(escolhido?.id === j.id),
            title: jaUsado ? "Já está no seu time" : pode ? "" : "Não há vaga para ele no seu time",
            onclick: () => tocarJogador(j),
          },
            h("span.pos", j.pos[0]),
            h("span.nome", j.n, h("small", [j.pos.map((p) => POS_NOME[p]).join(" / "), j.j ? ` · ${j.j} jogo${j.j > 1 ? "s" : ""}` : " · não jogou", j.g ? ` · ${j.g} gol${j.g > 1 ? "s" : ""}` : ""].join(""))),
            j.l ? h("span.lenda-selo", "★ LENDA") : h("span"),
            h("span.f", oculto() ? "?" : j.f)));
        })),
        girando ? null : h("div.linha-acoes",
          h("button.acao.secundaria.pequena", { type: "button", disabled: d.resorteiosRestantes <= 0, onclick: () => sortear("selecao") }, "↺ Outra seleção"),
          h("button.acao.secundaria.pequena", { type: "button", disabled: d.resorteiosRestantes <= 0, onclick: () => sortear("copa") }, "↺ Outra Copa")),
        girando ? null : h("p.dica", `Re-sorteios restantes: ${d.resorteiosRestantes}. "Outra seleção" mantém o ano; "outra Copa" mantém o país.`)));
  }

  function render() {
    const letreiroAntigo = tela.querySelector(".letreiro");
    const conteudoLetreiro = girando && letreiroAntigo ? [...letreiroAntigo.childNodes] : null;
    tela.replaceChildren(h("div.draft", painel(), centro(), lado()));
    if (conteudoLetreiro) tela.querySelector(".letreiro")?.replaceChildren(...conteudoLetreiro);
  }

  render();
}

// Guarda o time pronto (para "jogar de novo com o mesmo time" depois de recarregar a página).
function salvarTimePronto(d) {
  return { ...d, escalacao: d.escalacao.map((j) => `${j.ano}-${j.sel}|${j.id}`) };
}
