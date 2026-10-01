// Registra o service worker e avisa quando há versão nova do jogo.
export function registrarAtualizacoes() {
  if (!("serviceWorker" in navigator) || location.hostname === "localhost") return; // no desenvolvimento, sempre a versão do disco
  navigator.serviceWorker.register("sw.js").then((reg) => {
    const avisar = (sw) => {
      const barra = document.createElement("div");
      barra.className = "aviso-versao";
      barra.innerHTML = "<span>Tem edição nova do Escrete.</span>";
      const botao = Object.assign(document.createElement("button"), { className: "acao vermelha pequena", textContent: "Atualizar" });
      botao.onclick = () => sw.postMessage("assumir");
      barra.append(botao);
      document.body.append(barra);
    };
    if (reg.waiting && navigator.serviceWorker.controller) avisar(reg.waiting);
    reg.addEventListener("updatefound", () => {
      const novo = reg.installing;
      novo?.addEventListener("statechange", () => { if (novo.state === "installed" && navigator.serviceWorker.controller) avisar(novo); });
    });
  });
  let recarregando = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => { if (!recarregando) { recarregando = true; location.reload(); } });
}
