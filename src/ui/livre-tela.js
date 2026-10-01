// Modo livre: sem sorteio. Qualquer jogador de qualquer Copa, com busca e filtros.
import { FORMACOES, ESTILOS, POSICOES, custoImproviso } from "../motor/formacoes.js";
import { novoDraft, escalar, trocar, mudarFormacao, remover, completo } from "../motor/draft.js";
import { avaliarTime } from "../motor/time.js";
import { DIFICULDADES } from "../motor/copa.js";
import { preco, gasto, ORCAMENTO } from "../motor/orcamento.js";
import { h, botao, POS_NOME, guardado, sementeNova, preencher } from "./util.js";
import { campo } from "./campo.js";
import { passagem } from "./passagem.js";

const LIMITE_LISTA = 80;
const telaEstreita = () => matchMedia("(max-width: 760px)").matches;
const normalizar = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// Índice de busca montado uma vez: cada convocado com o texto já normalizado.
function indice(ctx) {
  if (ctx.indiceBusca) return ctx.indiceBusca;
  const lista = [];
  for (const e of ctx.dados.elencos) {
    const nomeSel = ctx.dados.selecoes[e.sel].nome;
    for (const j of e.js) lista.push({ j, e, busca: normalizar(`${j.n} ${nomeSel} ${e.ano}`) });
  }
  lista.sort((a, b) => b.j.f - a.j.f);
  ctx.indiceBusca = lista;
  return lista;
}

function salvar(estado) {
  guardado.gravar("livre", {
    ...estado.d,
    escalacao: estado.d.escalacao.map((j) => (j ? `${j.ano}-${j.sel}|${j.id}` : null)),
    dificuldade: estado.dificuldade, comOrcamento: estado.comOrcamento,
  });
}
function restaurar(porId) {
  const s = guardado.ler("livre", null);
  if (!s?.escalacao || !FORMACOES[s.formacao]) return null;
  try {
    const escalacao = s.escalacao.map((k) => {
      if (!k) return null;
      const [idElenco, idJogador] = k.split("|");
      const j = porId.get(idElenco)?.elenco.js.find((x) => x.id === idJogador);
      if (!j) throw new Error();
      return j;
    });
    return { d: { ...s, escalacao }, dificuldade: s.dificuldade ?? "normal", comOrcamento: !!s.comOrcamento };
  } catch {
    return null;
  }
}

export function telaLivre(tela, ctx) {
  const { dados, porId } = ctx;
  const sel = dados.selecoes;
  const idx = indice(ctx);
  const salvo = restaurar(porId);
  const estado = salvo ?? { d: novoDraft({ semente: sementeNova(), modo: "classico" }), dificuldade: "normal", comOrcamento: false };
  const filtro = { texto: "", ano: "", sel: "", pos: "", lendas: false, ordem: "nota" };
  let escolhido = null;   // jogador tocado na lista esperando vaga
  let vagaAlvo = null;    // vaga vazia tocada esperando jogador
  let trocaDe = null;     // vaga ocupada tocada: trocar ou tirar

  const d = () => estado.d;
  const restante = () => ORCAMENTO - gasto(d().escalacao);
  const caro = (j) => estado.comOrcamento && preco(j) > restante();

  function mudar(novo) {
    const cresceu = novo.escalacao.filter(Boolean).length > d().escalacao.filter(Boolean).length;
    estado.d = novo; salvar(estado); render();
    // No celular a lista fica embaixo do campo: depois de escalar, volta para o campo.
    if (cresceu && telaEstreita()) tela.querySelector(".campo")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }
  const limparSelecao = () => { escolhido = null; vagaAlvo = null; trocaDe = null; };

  function vagasLivresPara(j) {
    return FORMACOES[d().formacao].map((v, i) => ({ i, custo: d().escalacao[i] ? null : custoImproviso(j, v.pos) })).filter((x) => x.custo != null);
  }

  function tocarJogador(j) {
    if (vagaAlvo != null) {
      if (custoImproviso(j, FORMACOES[d().formacao][vagaAlvo].pos) != null) {
        const i = vagaAlvo; limparSelecao(); filtro.pos = "";
        return mudar(escalar(d(), j, i));
      }
    }
    if (escolhido?.id === j.id && escolhido.ano === j.ano) { escolhido = null; return render(); }
    const vagas = vagasLivresPara(j);
    const naturais = vagas.filter((v) => v.custo === 0);
    if (naturais.length === 1 && vagas.length === 1) { limparSelecao(); return mudar(escalar(d(), j, naturais[0].i)); }
    limparSelecao();
    escolhido = j;
    render();
  }

  function tocarVaga(i) {
    const vagas = FORMACOES[d().formacao];
    if (escolhido && !d().escalacao[i] && custoImproviso(escolhido, vagas[i].pos) != null) {
      const j = escolhido; limparSelecao();
      return mudar(escalar(d(), j, i));
    }
    if (trocaDe != null) {
      if (trocaDe === i) { limparSelecao(); return render(); }
      const novo = trocar(d(), trocaDe, i);
      limparSelecao();
      return novo.escalacao === d().escalacao ? render() : mudar(novo);
    }
    if (d().escalacao[i]) { limparSelecao(); trocaDe = i; return render(); }
    // Vaga vazia: filtra a lista pela posição dela e espera o jogador.
    limparSelecao();
    vagaAlvo = vagaAlvo === i ? null : i;
    filtro.pos = vagaAlvo == null ? "" : vagas[i].pos;
    render();
    if (vagaAlvo != null && telaEstreita()) tela.querySelector(".sorteio")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function resultados() {
    const t = normalizar(filtro.texto.trim());
    const termos = t ? t.split(/\s+/) : [];
    const out = [];
    let total = 0;
    const ordenada = filtro.ordem === "preco" ? [...idx].sort((a, b) => preco(a.j) - preco(b.j) || b.j.f - a.j.f)
      : filtro.ordem === "nome" ? [...idx].sort((a, b) => a.j.n.localeCompare(b.j.n, "pt")) : idx;
    for (const it of ordenada) {
      if (filtro.ano && it.e.ano !== +filtro.ano) continue;
      if (filtro.sel && it.e.sel !== filtro.sel) continue;
      if (filtro.pos && custoImproviso(it.j, filtro.pos) !== 0) continue;
      if (filtro.lendas && !it.j.l) continue;
      if (termos.length && !termos.every((p) => it.busca.includes(p))) continue;
      total++;
      if (out.length < LIMITE_LISTA) out.push(it);
    }
    return { out, total };
  }

  function disputar() {
    passagem.time = { ...d(), modo: "livre", dificuldade: estado.dificuldade, comOrcamento: estado.comOrcamento, nome: guardado.ler("nome-time", "Meu Escrete") };
    guardado.gravar("time-pronto", { ...passagem.time, escalacao: d().escalacao.map((j) => `${j.ano}-${j.sel}|${j.id}`) });
    location.hash = "#/copa";
  }

  function painel() {
    const av = avaliarTime(d().formacao, d().escalacao);
    const n = d().escalacao.filter(Boolean).length;
    const r = restante();
    return h("aside.painel",
      h("div.bloco", h("h2", "Formação"),
        h("div.opcoes", Object.keys(FORMACOES).map((f) => h("button.opcao", {
          type: "button", "aria-pressed": String(f === d().formacao),
          onclick: () => {
            if (f === d().formacao) return;
            const novo = mudarFormacao(d(), f);
            const saem = n - novo.escalacao.filter(Boolean).length;
            if (saem > 0 && !confirm(`Na ${f}, ${saem} jogador(es) ficam sem vaga e saem do time. Mudar?`)) return;
            limparSelecao(); mudar(novo);
          },
        }, f)))),
      h("div.bloco", h("h2", "Estilo de jogo"),
        h("div.opcoes", Object.entries(ESTILOS).map(([k, e]) => h("button.opcao", {
          type: "button", "aria-pressed": String(k === d().estilo), onclick: () => mudar({ ...d(), estilo: k }),
        }, e.nome)))),
      h("div.bloco", h("h2", "Dificuldade da Copa"),
        h("div.opcoes", Object.entries(DIFICULDADES).map(([k, x]) => h("button.opcao", {
          type: "button", "aria-pressed": String(k === estado.dificuldade),
          onclick: () => { estado.dificuldade = k; salvar(estado); render(); },
        }, x.nome))),
        h("p.dica", estado.dificuldade === "lendaria" ? "Só os maiores elencos da história pela frente, desde a estreia."
          : estado.dificuldade === "dificil" ? "Adversários fortes desde o grupo." : "A Copa de sempre: começa fácil e vai apertando.")),
      h("div.bloco", h("h2", "Orçamento"),
        h("div.opcoes",
          h("button.opcao", { type: "button", "aria-pressed": String(!estado.comOrcamento), onclick: () => { estado.comOrcamento = false; salvar(estado); render(); } }, "Sem limite"),
          h("button.opcao", { type: "button", "aria-pressed": String(estado.comOrcamento), onclick: () => { estado.comOrcamento = true; salvar(estado); render(); } }, `${ORCAMENTO} de teto`)),
        estado.comOrcamento
          ? h("p", h("b.num", { style: { fontSize: "1.5rem", color: r < 0 ? "var(--vermelho)" : "inherit" } }, r), " restantes de ", ORCAMENTO,
            r < 0 ? h("span.dica", " — estourou: tire alguém para disputar.") : null)
          : h("p.dica", "Cada jogador tem preço pela nota; com teto, um time só de lendas não cabe.")),
      h("div.bloco", h("h2", `Seu time · ${n}/11`),
        h("div.placar-time",
          h("div", h("b", n ? Math.round(av.geral) : "–"), h("span", "Geral")),
          h("div", h("b", n ? Math.round(av.ataque) : "–"), h("span", "Ataque")),
          h("div", h("b", n ? Math.round(av.defesa) : "–"), h("span", "Defesa")),
          h("div", h("b", av.goleiro ? Math.round(av.goleiro) : "–"), h("span", "Goleiro"))),
        h("p.dica", `Entrosamento: +${av.entrosamento.toFixed(1)}.`),
        h("div.linha-acoes",
          h("button.acao.secundaria.pequena", { type: "button", onclick: () => {
            if (n && !confirm("Esvaziar o time?")) return;
            limparSelecao(); mudar(novoDraft({ semente: sementeNova(), formacao: d().formacao, estilo: d().estilo }));
          } }, "Esvaziar"))));
  }

  function centro() {
    const vagas = FORMACOES[d().formacao];
    const alvos = escolhido ? new Set(vagasLivresPara(escolhido).map((v) => v.i)) : vagaAlvo != null ? new Set([vagaAlvo]) : null;
    let alvosTroca = null;
    if (trocaDe != null) {
      alvosTroca = new Set();
      const a = d().escalacao[trocaDe];
      vagas.forEach((v, i) => {
        const b = d().escalacao[i];
        if (i !== trocaDe && custoImproviso(a, v.pos) != null && (!b || custoImproviso(b, vagas[trocaDe].pos) != null)) alvosTroca.add(i);
      });
    }
    let dica = "Toque numa vaga vazia para filtrar a lista por aquela posição, ou busque um jogador ao lado.";
    if (escolhido) dica = `Escolha a vaga de ${escolhido.n} (borda amarela).`;
    if (vagaAlvo != null) dica = `Vaga de ${POS_NOME[vagas[vagaAlvo].pos]} escolhida: toque num jogador da lista.`;
    const pode = completo(d()) && !(estado.comOrcamento && restante() < 0);
    return h("section",
      campo({ formacao: d().formacao, escalacao: d().escalacao, selecoes: sel, alvos, alvosTroca, selecionada: trocaDe, aoClicar: tocarVaga }),
      trocaDe != null
        ? h("div.linha-acoes", { style: { justifyContent: "center" } },
          h("span.dica", "Toque em outra vaga para trocar, ou "),
          h("button.acao.secundaria.pequena", { type: "button", onclick: () => { const i = trocaDe; limparSelecao(); mudar(remover(d(), i)); } }, "Tirar do time"))
        : h("p.dica", { style: { textAlign: "center" } }, dica),
      h("div.linha-acoes", { style: { justifyContent: "center" } },
        h("button.acao.vermelha", { type: "button", disabled: !pode, onclick: disputar }, "Disputar a Copa →")));
  }

  // A lista é re-renderizada sozinha ao digitar, para não perder o foco do campo de busca.
  const areaLista = h("div");
  function lista() {
    const { out, total } = resultados();
    preencher(areaLista,
      h("p.dica", `${total.toLocaleString("pt-BR")} jogador${total === 1 ? "" : "es"}${total > LIMITE_LISTA ? ` · mostrando os ${LIMITE_LISTA} primeiros` : ""}`),
      h("ul.lista-elenco", out.map(({ j, e }) => {
        const usado = d().usados.includes(j.id);
        const semVaga = vagaAlvo != null ? custoImproviso(j, FORMACOES[d().formacao][vagaAlvo].pos) == null : vagasLivresPara(j).length === 0;
        const bloqueado = usado || semVaga || caro(j);
        return h("li", h("button.jogador.com-botao", {
          type: "button", disabled: bloqueado, "aria-pressed": String(escolhido?.id === j.id && escolhido.ano === j.ano),
          title: usado ? "Já está no time (a pessoa, em qualquer Copa)" : caro(j) ? "Não cabe no orçamento" : semVaga ? "Sem vaga para ele" : "",
          onclick: () => tocarJogador(j),
        },
          botao(j, sel[e.sel]?.cores),
          h("span.nome", j.n, h("small", `${sel[e.sel].nome} ${e.ano} · ${j.pos.map((p) => p).join("/")}${j.g ? ` · ${j.g} gol${j.g > 1 ? "s" : ""}` : ""}`)),
          estado.comOrcamento ? h("span.preco.num", `$${preco(j)}`) : j.l ? h("span.lenda-selo", "★") : h("span"),
          h("span.f", j.f)));
      })));
  }

  function lado() {
    const anos = [...new Set(dados.elencos.map((e) => e.ano))].sort((a, b) => b - a);
    const selecoes = Object.entries(sel).sort((a, b) => a[1].nome.localeCompare(b[1].nome, "pt"));
    const campoTexto = h("input.busca", {
      type: "search", placeholder: "Buscar: Pelé, Zidane, Hungria 1954…", value: filtro.texto, "aria-label": "Buscar jogador",
      oninput: (ev) => { filtro.texto = ev.target.value; lista(); },
    });
    const seletor = (rotulo, valor, opcoes, aoMudar) => h("label.filtro", h("span.versalete", rotulo),
      h("select", { onchange: (ev) => { aoMudar(ev.target.value); render(); } },
        opcoes.map(([v, t]) => h("option", { value: v, selected: String(v) === String(valor) ? "" : null }, t))));
    lista();
    return h("aside",
      h("div.sorteio",
        h("p.chapeu", "Modo livre · sem sorteio"),
        campoTexto,
        h("div.filtros",
          seletor("Copa", filtro.ano, [["", "Todas"], ...anos.map((a) => [a, a])], (v) => (filtro.ano = v)),
          seletor("Seleção", filtro.sel, [["", "Todas"], ...selecoes.map(([c, s]) => [c, s.nome])], (v) => (filtro.sel = v)),
          seletor("Posição", filtro.pos, [["", "Todas"], ...Object.entries(POSICOES).map(([p, x]) => [p, x.nome])], (v) => { filtro.pos = v; vagaAlvo = null; }),
          seletor("Ordem", filtro.ordem, [["nota", "Maior nota"], ["preco", "Menor preço"], ["nome", "Nome"]], (v) => (filtro.ordem = v))),
        h("label.checar", h("input", { type: "checkbox", checked: filtro.lendas ? "" : null, onchange: (ev) => { filtro.lendas = ev.target.checked; lista(); } }), " Só lendas"),
        areaLista));
  }

  function render() {
    const busca = tela.querySelector("input.busca");
    const tinhaFoco = busca && document.activeElement === busca;
    tela.replaceChildren(h("div.draft", painel(), centro(), lado()));
    if (tinhaFoco) tela.querySelector("input.busca")?.focus();
  }

  render();
}
