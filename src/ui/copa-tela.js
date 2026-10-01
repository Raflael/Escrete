// A Copa do seu time, contada como súmula de jornal: jogo a jogo, lance a lance.
import { simularCopa, FASES, DIFICULDADES } from "../motor/copa.js";
import { ESTILOS } from "../motor/formacoes.js";
import { h, escudo, nomeCurto, guardado, espera, preencher, plural } from "./util.js";
import { passagem } from "./passagem.js";

function timePronto(porId) {
  if (passagem.time) return passagem.time;
  const s = guardado.ler("time-pronto", null);
  if (!s) return null;
  try {
    const escalacao = s.escalacao.map((k) => {
      const [idElenco, idJogador] = k.split("|");
      const j = porId.get(idElenco)?.elenco.js.find((x) => x.id === idJogador);
      if (!j) throw new Error();
      return j;
    });
    return { ...s, escalacao, nome: guardado.ler("nome-time", "Meu Escrete") };
  } catch {
    return null;
  }
}

const NOME_FASE_CURTO = { G1: "1º jogo", G2: "2º jogo", G3: "3º jogo", OIT: "Oitavas", QUA: "Quartas", SEM: "Semi", FIN: "Final" };
const ONDE_CAIU = { G3: "na fase de grupos", OIT: "nas oitavas", QUA: "nas quartas", SEM: "na semifinal", FIN: "na final" };

// Manchete no estilo de jornal esportivo, que dispensa artigo: "Escrete vence Itália de 1982 por 2 a 1".
const deAno = (advNome) => advNome.replace(/ (\d{4})$/, " de $1");
function manchete(nome, j) {
  const adv = deAno(j.advNome);
  const placar = `${Math.max(j.gA, j.gB)} a ${Math.min(j.gA, j.gB)}`;
  if (j.penaltis) {
    const p = `${Math.max(j.penaltis.placar.A, j.penaltis.placar.B)} a ${Math.min(j.penaltis.placar.A, j.penaltis.placar.B)}`;
    return j.vencedor === "A" ? `${nome} passa por ${adv} nos pênaltis: ${p}` : `${adv} elimina ${nome} nos pênaltis: ${p}`;
  }
  if (j.gA > j.gB) return `${nome} ${j.gA - j.gB >= 3 ? "atropela" : "vence"} ${adv} por ${placar}`;
  if (j.gA < j.gB) return `${nome} perde para ${adv} por ${placar}`;
  return `${nome} e ${adv} empatam: ${placar}`;
}

export function telaCopa(tela, ctx) {
  const { dados, advs, porId } = ctx;
  const time = timePronto(porId);
  if (!time) {
    tela.append(h("div.copa", h("p.aviso", "Nenhum time pronto ainda. "), h("a.acao", { href: "#/jogar" }, "Montar o time →")));
    return;
  }
  const n = guardado.ler("copas-jogadas", 0) + 1;
  guardado.gravar("copas-jogadas", n);
  const semente = `${time.semente}:copa:${n}`;
  const lado = { nome: time.nome, formacao: time.formacao, estilo: time.estilo, escalacao: time.escalacao };
  const res = simularCopa(semente, lado, advs, { evitar: time.elencosUsados, dificuldade: time.dificuldade ?? "normal" });
  const cores = (sel) => dados.selecoes[sel]?.cores;

  let k = 0;           // jogo sendo mostrado
  let pular = false;   // revelar tudo de uma vez
  const raiz = h("div.copa");
  tela.append(raiz);

  async function mostrarJogo() {
    const j = res.jogos[k];
    const adv = porId.get(j.adversario).elenco;
    const placarA = h("span", "0"), placarB = h("span", "0");
    const lances = h("ul.lances");
    const botoes = h("div.linha-acoes");
    const titulo = h("h2.manchete", " ");
    preencher(raiz, 
      caminho(res, k),
      h("p.chapeu", j.fase.nome),
      titulo,
      h("div.placar-jogo",
        h("div.lado", escudo(["#1f1a17", "#b3261e"], 30), time.nome),
        h("div.gols", placarA, " × ", placarB),
        h("div.lado.dir", j.advNome, escudo(cores(adv.sel), 30))),
      lances, botoes);
    let a = 0, b = 0;
    for (const g of j.gols) {
      if (!pular) await espera(g.min > 90 ? 700 : 450);
      if (g.lado === "A") a++; else b++;
      placarA.textContent = a; placarB.textContent = b;
      lances.append(h("li" + (g.lado === "B" ? ".deles" : ""),
        h("span.min", `${g.min}'`),
        h("span", g.lado === "A" ? h("b", nomeCurto(g.autor.n)) : nomeCurto(g.autor.n), g.lado === "A" ? "" : ` (${j.advNome})`)));
    }
    if (!j.gols.length) lances.append(h("li", h("span.min", "90'"), h("span.suave", "Sem gols.")));
    if (j.prorrogacao) lances.append(h("li", h("span.min", "120'"), h("span.suave", "Fim da prorrogação.")));
    if (j.penaltis) {
      const fila = h("div.penaltis", h("span.versalete", "Pênaltis "));
      lances.after(fila);
      for (const c of j.penaltis.cobrancas) {
        if (!pular) await espera(380);
        fila.append(h("span.cobr." + (c.gol ? "gol" : "fora"), {
          title: `${c.lado === "A" ? time.nome : j.advNome}: ${c.autor.n} ${c.gol ? "marcou" : "perdeu"}`,
        }, c.lado === "A" ? "N" : "E"));
      }
      fila.append(h("span.num", ` ${j.penaltis.placar.A} × ${j.penaltis.placar.B}`));
    }
    titulo.textContent = manchete(time.nome, j);
    if (j.fase.chave === "G3") raiz.append(tabelaGrupo(res, time.nome));
    const ultimo = k === res.jogos.length - 1;
    botoes.append(ultimo
      ? h("button.acao.vermelha", { type: "button", onclick: resumo }, "Ver o resumo da campanha →")
      : h("button.acao.vermelha", { type: "button", onclick: () => { k++; mostrarJogo(); } }, "Próximo jogo →"));
    if (!ultimo) botoes.append(h("button.acao.secundaria", { type: "button", onclick: () => { pular = true; k = res.jogos.length - 1; mostrarJogo(); } }, "Pular para o fim"));
    botoes.querySelector("button")?.focus();
  }

  function resumo() {
    const ultimo = res.jogos.at(-1);
    let titulo;
    if (res.campeao && res.setePerfeito && res.semSofrer) titulo = "O ESCRETE PERFEITO: sete vitórias, nenhum gol sofrido";
    else if (res.campeao && res.setePerfeito) titulo = `${time.nome} é campeão com sete vitórias em sete jogos`;
    else if (res.campeao) titulo = `${time.nome} é campeão do mundo!`;
    else if (res.posicaoGrupo > 2) titulo = `${time.nome} cai na fase de grupos`;
    else titulo = `${time.nome} cai ${ONDE_CAIU[ultimo.fase.chave]}; ${deAno(ultimo.advNome)} segue na Copa`;

    const selos = [];
    if (res.campeao && res.setePerfeito && res.semSofrer) selos.push(h("span.selo.ouro", "★ Escrete perfeito"));
    if (res.campeao && res.setePerfeito) selos.push(h("span.selo.ouro", "7 em 7"));
    if (res.campeao) selos.push(h("span.selo", "Campeão"));
    if (res.semSofrer) selos.push(h("span.selo", "Cadeado · 0 gols sofridos"));
    if (res.gp >= 20) selos.push(h("span.selo", `Rolo compressor · ${res.gp} gols`));
    if (res.jogos.some((j) => j.penaltis && j.vencedor === "A")) selos.push(h("span.selo", "Frieza nos pênaltis"));
    if (time.modo === "almanaque") selos.push(h("span.selo", "De almanaque"));
    if (time.modo === "livre") selos.push(h("span.selo", `Modo livre · ${DIFICULDADES[time.dificuldade ?? "normal"].nome}${time.comOrcamento ? " · com teto" : ""}`));

    // Artilharia do seu time
    const gols = new Map();
    for (const j of res.jogos) for (const g of j.gols) if (g.lado === "A") gols.set(g.autor.n, (gols.get(g.autor.n) ?? 0) + 1);
    const artilheiros = [...gols.entries()].sort((a, b) => b[1] - a[1]);

    registrarHistorico(time, res);
    preencher(raiz, 
      caminho(res, res.jogos.length),
      h("p.chapeu", res.campeao ? "Fim de Copa · Taça na mão" : "Fim de Copa"),
      h("h2.manchete", titulo),
      h("p", `${plural(res.jogos.filter((j) => j.vencedor === "A" || (j.fase.tipo === "grupo" && j.gA > j.gB)).length, "vitória", "vitórias")} em ${res.jogos.length} jogos · ${plural(res.gp, "gol marcado", "gols marcados")}, ${plural(res.gc, "sofrido", "sofridos")} · ${time.formacao}, ${ESTILOS[time.estilo].nome.toLowerCase()}, nota ${Math.round(res.avaliacao.geral)}.`),
      selos.length ? h("div.selos", selos) : null,
      h("div.bloco", h("h2", "Artilharia do seu time"),
        artilheiros.length
          ? h("ol.artilharia", artilheiros.map(([nome, g]) => h("li", `${nome} — ${g} gol${g > 1 ? "s" : ""}`)))
          : h("p.suave", "Ninguém balançou a rede.")),
      h("div.bloco", h("h2", "Os jogos"),
        h("table.tabela", h("tbody", res.jogos.map((j) => h("tr",
          h("td", NOME_FASE_CURTO[j.fase.chave]),
          h("td", j.advNome),
          h("td.n", `${j.gA} × ${j.gB}${j.prorrogacao && !j.penaltis ? " (prorr.)" : ""}${j.penaltis ? ` (pên. ${j.penaltis.placar.A}×${j.penaltis.placar.B})` : ""}`)))))),
      h("div.linha-acoes",
        h("button.acao.vermelha", { type: "button", onclick: () => { passagem.time = time; location.hash = "#/copa/" + Date.now(); } }, "Outra Copa com o mesmo time"),
        time.modo === "livre"
          ? h("a.acao.secundaria", { href: "#/livre" }, "Mexer no time")
          : h("a.acao.secundaria", { href: "#/jogar", onclick: () => guardado.gravar("draft", null) }, "Montar outro time")));
  }

  mostrarJogo();
}

// Faixa com as sete fases e os resultados até agora.
function caminho(res, ate) {
  return h("div.caminho", FASES.map((f, i) => {
    const j = res.jogos[i];
    if (!j || i >= ate) return h("div.futuro", h("b", NOME_FASE_CURTO[f.chave]), j ? "·" : "—");
    const cls = j.vencedor === "A" || (f.tipo === "grupo" && j.gA > j.gB) ? "v" : j.vencedor === "B" || (f.tipo === "grupo" && j.gA < j.gB) ? "d" : "e";
    return h("div." + cls, h("b", NOME_FASE_CURTO[f.chave]), `${j.gA}×${j.gB}${j.penaltis ? " p" : ""}`);
  }));
}

function tabelaGrupo(res, nome) {
  return h("div.bloco", h("h2", "Classificação do grupo"),
    h("table.tabela",
      h("thead", h("tr", h("th", "#"), h("th", "Seleção"), h("th.n", "Pts"), h("th.n", "SG"), h("th.n", "GP"))),
      h("tbody", res.tabela.map((t, i) => h("tr" + (t.i === 0 ? ".eu" : "") + (i === 1 ? ".corte" : ""),
        h("td", i + 1), h("td", t.i === 0 ? nome : t.nome), h("td.n", t.pts), h("td.n", t.sg > 0 ? "+" + t.sg : t.sg), h("td.n", t.gp))))),
    h("p.dica", res.posicaoGrupo <= 2 ? "Os dois primeiros avançam. Classificado!" : "Só os dois primeiros avançam."));
}

function registrarHistorico(time, res) {
  const hist = guardado.ler("historico", []);
  hist.unshift({
    quando: new Date().toISOString(),
    nome: time.nome, formacao: time.formacao, estilo: time.estilo, modo: time.modo, dificuldade: time.dificuldade, comOrcamento: time.comOrcamento,
    nota: Math.round(res.avaliacao.geral),
    campeao: res.campeao, setePerfeito: res.setePerfeito, semSofrer: res.semSofrer,
    alcance: res.campeao ? "Campeão" : res.posicaoGrupo > 2 ? "Grupos" : NOME_FASE_CURTO[res.jogos.at(-1).fase.chave],
    gp: res.gp, gc: res.gc,
    time: time.escalacao.map((j) => `${nomeCurto(j.n)} (${j.ano})`),
  });
  guardado.gravar("historico", hist.slice(0, 60));
}
