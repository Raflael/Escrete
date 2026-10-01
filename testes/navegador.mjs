// Controle mínimo do Chrome pelo protocolo de depuração (CDP), sem dependências.
// uso: const nav = await abrirNavegador({ largura, altura }); await nav.ir(url); await nav.js("..."); await nav.foto("x.png"); nav.fechar();
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

export async function abrirNavegador({ largura = 1280, altura = 900, porta = 9333 } = {}) {
  const perfil = fs.mkdtempSync(path.join(os.tmpdir(), "escrete-chrome-"));
  const proc = spawn(CHROME, [
    "--headless=new", "--disable-gpu", "--hide-scrollbars", `--remote-debugging-port=${porta}`,
    `--user-data-dir=${perfil}`, `--window-size=${largura},${altura}`, "--no-first-run", "about:blank",
  ], { stdio: "ignore" });
  let alvos;
  for (let i = 0; i < 50; i++) {
    try { alvos = await (await fetch(`http://127.0.0.1:${porta}/json/list`)).json(); if (alvos.some((a) => a.type === "page")) break; } catch {}
    await espera(150);
  }
  const pagina = alvos.find((a) => a.type === "page");
  const ws = new WebSocket(pagina.webSocketDebuggerUrl);
  await new Promise((r, e) => { ws.onopen = r; ws.onerror = e; });
  let id = 0;
  const pendentes = new Map();
  const erros = [];
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pendentes.has(m.id)) { pendentes.get(m.id)(m); pendentes.delete(m.id); }
    if (m.method === "Runtime.exceptionThrown") erros.push(m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text);
    if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") erros.push(m.params.args.map((a) => a.value ?? a.description).join(" "));
  };
  const cmd = (method, params = {}) => new Promise((r) => { const i = ++id; pendentes.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  await cmd("Runtime.enable");
  await cmd("Page.enable");
  await cmd("Emulation.setDeviceMetricsOverride", { width: largura, height: altura, deviceScaleFactor: 1, mobile: largura < 600 });

  const nav = {
    erros,
    async ir(url) { await cmd("Page.navigate", { url }); await espera(900); },
    async js(expr) {
      const r = await cmd("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true });
      if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description ?? "erro no js");
      return r.result?.result?.value;
    },
    async clicar(seletor, texto) {
      const ok = await nav.js(`(() => {
        const els = [...document.querySelectorAll(${JSON.stringify(seletor)})].filter(e => !e.disabled);
        const el = ${texto ? `els.find(e => e.textContent.includes(${JSON.stringify(texto)}))` : "els[0]"};
        if (!el) return false; el.click(); return true; })()`);
      if (!ok) throw new Error(`não achei para clicar: ${seletor} ${texto ?? ""}`);
      await espera(120);
    },
    async esperarAte(expr, ms = 8000) {
      const t0 = Date.now();
      while (Date.now() - t0 < ms) { if (await nav.js(expr)) return true; await espera(100); }
      throw new Error("tempo esgotado esperando: " + expr);
    },
    async foto(arquivo, { inteira = false } = {}) {
      let params = { format: "png" };
      if (inteira) {
        const alt = await nav.js("document.documentElement.scrollHeight");
        await cmd("Emulation.setDeviceMetricsOverride", { width: largura, height: alt, deviceScaleFactor: 1, mobile: largura < 600 });
        await espera(200);
      }
      const r = await cmd("Page.captureScreenshot", params);
      fs.writeFileSync(arquivo, Buffer.from(r.result.data, "base64"));
      if (inteira) await cmd("Emulation.setDeviceMetricsOverride", { width: largura, height: altura, deviceScaleFactor: 1, mobile: largura < 600 });
    },
    espera,
    fechar() { try { ws.close(); } catch {} proc.kill(); },
  };
  return nav;
}
