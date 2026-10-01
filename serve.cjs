// Servidor estático de desenvolvimento: node serve.cjs [porta]
const http = require("http");
const fs = require("fs");
const path = require("path");

const RAIZ = __dirname;
const PORTA = +(process.argv[2] ?? 8110);
const TIPOS = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".woff2": "font/woff2",
  ".svg": "image/svg+xml", ".png": "image/png", ".webmanifest": "application/manifest+json", ".ico": "image/x-icon",
};

http.createServer((req, res) => {
  const url = decodeURIComponent(new URL(req.url, "http://x").pathname);
  let arq = path.normalize(path.join(RAIZ, url));
  if (!arq.startsWith(RAIZ) || arq.includes(`${path.sep}dados${path.sep}brutos`)) { res.writeHead(403); return res.end(); }
  if (fs.existsSync(arq) && fs.statSync(arq).isDirectory()) arq = path.join(arq, "index.html");
  fs.readFile(arq, (erro, conteudo) => {
    if (erro) { res.writeHead(404); return res.end("não achei " + url); }
    res.writeHead(200, { "Content-Type": TIPOS[path.extname(arq)] ?? "application/octet-stream", "Cache-Control": "no-store" });
    res.end(conteudo);
  });
}).listen(PORTA, () => console.log(`http://localhost:${PORTA}`));
