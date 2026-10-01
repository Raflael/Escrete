// Modo livre pela interface: busca, escalação por vaga, orçamento, dificuldade e Copa.
// uso: node testes/fluxo-livre.mjs [largura] [altura]   (servidor rodando em :8110)
import { abrirNavegador } from "./navegador.mjs";
import fs from "node:fs";

const largura = +(process.argv[2] ?? 1280), altura = +(process.argv[3] ?? 950);
const pasta = new URL("./capturas/", import.meta.url);
fs.mkdirSync(pasta, { recursive: true });
const foto = (nome) => new URL(`${nome}-${largura}.png`, pasta).pathname.replace(/^\/(\w:)/, "$1");

const nav = await abrirNavegador({ largura, altura });
try {
  await nav.ir("http://localhost:8110/#/livre");
  await nav.js("localStorage.clear(); location.reload()");
  await nav.espera(1500);
  // Busca pelo nome
  await nav.js(`(() => { const i = document.querySelector("input.busca"); i.value = "pele"; i.dispatchEvent(new Event("input")); })()`);
  await nav.espera(300);
  console.log("busca 'pele':", await nav.js(`[...document.querySelectorAll(".jogador .nome")].slice(0,4).map(e => e.firstChild.textContent + " / " + e.querySelector("small").textContent).join(" | ")`));
  await nav.foto(foto("livre-busca"));
  await nav.clicar("button.jogador");
  if (await nav.js("!!document.querySelector('.vaga.alvo')")) await nav.clicar(".vaga.alvo");
  await nav.js(`(() => { const i = document.querySelector("input.busca"); i.value = ""; i.dispatchEvent(new Event("input")); })()`);
  // Preenche o resto tocando na vaga vazia e no primeiro jogador disponível
  for (let k = 0; k < 12; k++) {
    const vazia = await nav.js(`(() => { const v = [...document.querySelectorAll("button.vaga")].find(b => b.querySelector(".vaga-vazia")); if (!v) return false; v.click(); return true; })()`);
    if (!vazia) break;
    await nav.espera(150);
    await nav.clicar("button.jogador");
    await nav.espera(150);
  }
  console.log("escalados:", await nav.js(`document.querySelectorAll("button.vaga .botao").length`));
  await nav.clicar("button.opcao", "de teto");
  await nav.espera(200);
  await nav.foto(foto("livre-orcamento"));
  console.log("orçamento:", await nav.js(`document.querySelector(".painel b.num")?.textContent`), "· disputar habilitado?", await nav.js(`![...document.querySelectorAll("button.acao")].find(b => b.textContent.includes("Disputar")).disabled`));
  await nav.clicar("button.opcao", "Sem limite");
  await nav.clicar("button.opcao", "Lendária");
  await nav.foto(foto("livre-completo"));
  await nav.clicar("button.acao", "Disputar");
  await nav.esperarAte("!!document.querySelector('.placar-jogo')");
  await nav.esperarAte("[...document.querySelectorAll('button')].some(b => b.textContent.includes('Pular'))", 20000);
  await nav.clicar("button.acao", "Pular");
  await nav.esperarAte("[...document.querySelectorAll('button')].some(b => b.textContent.includes('resumo'))", 20000);
  await nav.clicar("button.acao", "resumo");
  await nav.espera(400);
  await nav.foto(foto("livre-resumo"), { inteira: true });
  console.log("manchete:", await nav.js("document.querySelector('.manchete')?.textContent"));
  console.log("adversários:", await nav.js(`[...document.querySelectorAll(".tabela td:nth-child(2)")].map(t => t.textContent).join(", ")`));
} catch (e) {
  console.log("FALHOU:", e.message);
  await nav.foto(foto("livre-erro"));
} finally {
  console.log(nav.erros.length ? "erros no console:\n  " + nav.erros.join("\n  ") : "sem erros no console");
  nav.fechar();
}
