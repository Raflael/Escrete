// Joga uma partida inteira pela interface: draft de 11 rodadas, Copa e resumo. Tira fotos no caminho.
// uso: node testes/fluxo.mjs [largura] [altura]   (servidor rodando em :8110)
import { abrirNavegador } from "./navegador.mjs";
import fs from "node:fs";

const largura = +(process.argv[2] ?? 1280), altura = +(process.argv[3] ?? 950);
const pasta = new URL("./capturas/", import.meta.url);
fs.mkdirSync(pasta, { recursive: true });
const foto = (nome) => new URL(`${nome}-${largura}.png`, pasta).pathname.replace(/^\/(\w:)/, "$1");

const BASE = process.env.BASE ?? "http://localhost:8110";
const nav = await abrirNavegador({ largura, altura });
try {
  await nav.ir(`${BASE}/#/jogar`);
  await nav.js("localStorage.clear(); location.reload()");
  await nav.espera(1200);
  for (let r = 1; r <= 11; r++) {
    await nav.clicar("button.acao", "Sortear");
    await nav.esperarAte("!!document.querySelector('.lista-elenco')");
    if (r === 3) await nav.foto(foto("draft-sorteio"));
    await nav.clicar("button.jogador");
    await nav.espera(150);
    if (await nav.js("!!document.querySelector('.vaga.alvo')")) await nav.clicar(".vaga.alvo");
    await nav.esperarAte("!document.querySelector('.lista-elenco')");
  }
  await nav.foto(foto("draft-completo"));
  await nav.clicar("button.acao", "Disputar");
  await nav.esperarAte("!!document.querySelector('.placar-jogo')");
  await nav.esperarAte("[...document.querySelectorAll('button')].some(b => b.textContent.includes('Próximo jogo'))", 20000);
  await nav.foto(foto("copa-jogo1"));
  await nav.clicar("button.acao", "Pular");
  await nav.esperarAte("[...document.querySelectorAll('button')].some(b => b.textContent.includes('resumo'))", 20000);
  await nav.foto(foto("copa-ultimo-jogo"));
  await nav.clicar("button.acao", "resumo");
  await nav.espera(400);
  await nav.foto(foto("copa-resumo"), { inteira: true });
  console.log("manchete final:", await nav.js("document.querySelector('.manchete')?.textContent"));
} catch (e) {
  console.log("FALHOU:", e.message);
  await nav.foto(foto("erro"));
} finally {
  console.log(nav.erros.length ? "erros no console:\n  " + nav.erros.join("\n  ") : "sem erros no console");
  nav.fechar();
}
