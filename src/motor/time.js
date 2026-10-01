// Força de um time escalado: ataque, defesa, goleiro e entrosamento.
import { FORMACOES, PESO, forcaNaVaga } from "./formacoes.js";

// escalacao: array alinhado com as vagas da formação; cada item é um jogador ou null.
// Jogador: { id, n (nome), pos: [...], f (força), l (lenda), sel, ano }
export function avaliarTime(formacao, escalacao) {
  const vagas = FORMACOES[formacao];
  let atk = 0, pAtk = 0, def = 0, pDef = 0, soma = 0, qtd = 0, goleiro = null;
  vagas.forEach((vaga, i) => {
    const j = escalacao[i];
    if (vaga.pos === "GOL") {
      if (j) { goleiro = forcaNaVaga(j, "GOL"); soma += goleiro; qtd++; }
      return;
    }
    const peso = PESO[vaga.pos];
    if (!j) return; // time incompleto: a média é só de quem já está escalado
    pAtk += peso.atk;
    pDef += peso.def;
    const f = forcaNaVaga(j, vaga.pos);
    atk += f * peso.atk;
    def += f * peso.def;
    soma += f;
    qtd++;
  });
  const ent = entrosamento(escalacao);
  return {
    ataque: pAtk ? atk / pAtk : 0,
    defesa: pDef ? def / pDef : 0,
    goleiro: goleiro ?? 0,
    geral: qtd ? soma / qtd : 0,
    entrosamento: ent,
    completo: escalacao.filter(Boolean).length === vagas.length,
  };
}

// Entrosamento: jogadores que dividiram o vestiário se entendem.
// Mesmo elenco (seleção + Copa) vale mais que só o mesmo país em Copas diferentes.
// Devolve um bônus em pontos de força (0 a ~3), aplicado ao ataque e à defesa.
export function entrosamento(escalacao) {
  const js = escalacao.filter(Boolean);
  let pares = 0;
  for (let a = 0; a < js.length; a++)
    for (let b = a + 1; b < js.length; b++) {
      if (js[a].sel !== js[b].sel) continue;
      pares += js[a].ano === js[b].ano ? 1 : 0.35;
    }
  // 55 pares possíveis num XI; a curva satura para não virar "escale um elenco inteiro".
  return +(3 * (1 - Math.exp(-pares / 9))).toFixed(2);
}

// Nota exibida de 0 a 99 (a média simples das forças nas vagas, já com improvisos).
export const notaExibida = (av) => Math.round(av.geral);

// Melhor escalação possível de um elenco numa formação (usado para montar adversários).
// Guloso por vaga mais restrita primeiro; bom o bastante para 11 vagas e ~23 jogadores.
export function melhorEscalacao(formacao, elenco) {
  const vagas = FORMACOES[formacao];
  const ordem = vagas.map((v, i) => i).sort((a, b) => {
    const cand = (i) => elenco.filter((j) => forcaNaVaga(j, vagas[i].pos) != null).length;
    return cand(a) - cand(b);
  });
  const usados = new Set();
  const esc = vagas.map(() => null);
  for (const i of ordem) {
    let melhor = null, mf = -1;
    for (const j of elenco) {
      if (usados.has(j.id)) continue;
      const f = forcaNaVaga(j, vagas[i].pos);
      if (f != null && f > mf) { mf = f; melhor = j; }
    }
    if (melhor) { esc[i] = melhor; usados.add(melhor.id); }
  }
  return esc;
}
