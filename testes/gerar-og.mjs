// Gera og.png (1200x630) a partir de og.html. uso: node testes/gerar-og.mjs <porta-do-servidor>
import { abrirNavegador } from "./navegador.mjs";
const porta = process.argv[2] ?? "8120";
const nav = await abrirNavegador({ largura: 1200, altura: 630, porta: 9341 });
await nav.ir(`http://localhost:${porta}/og.html`);
await nav.esperarAte("document.body.dataset.pronto === '1'", 15000);
await nav.espera(600);
await nav.foto("og.png", { recorte: { x: 0, y: 0, width: 1200, height: 630 } });
console.log(nav.erros.length ? "erros: " + nav.erros.join(" | ") : "og.png gerado");
nav.fechar();
