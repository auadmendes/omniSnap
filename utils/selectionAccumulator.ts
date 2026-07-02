// utils/selectionAccumulator.ts

let textosAcumulados: string[] = [];
let elementosMarcados: HTMLElement[] = [];

/**
 * Captura a seleção atual se o usuário estiver segurando a tecla CTRL,
 * acumula na lista e atualiza o Clipboard (Ctrl+C) instantaneamente.
 */
export async function verificarEAcumularSelecao(event: MouseEvent) {
  // 1. Só acumula se a tecla CTRL estiver pressionada
  if (!event.ctrlKey) return null;

  const selection = window.getSelection();
  if (!selection || selection.isCollapsed) return null;

  const textoSelecionado = selection.toString().trim();
  if (textoSelecionado.length === 0) return null;

  // Evita duplicados seguidos na mesma rodada
  if (textosAcumulados.includes(textoSelecionado)) return null;

  // 2. Adiciona o texto à nossa lista na memória
  textosAcumulados.push(textoSelecionado);
  console.log(`[OmniSnap] Item acumulado! Total: ${textosAcumulados.length}`);

  // 3. NOVO: Junta tudo e joga direto para o Clipboard do sistema operacional!
  try {
    const textoJunto = textosAcumulados.join("\n\n");
    await navigator.clipboard.writeText(textoJunto);
  } catch (err) {
    console.error("[OmniSnap] Falha ao atualizar a área de transferência automaticamente:", err);
  }

  // 4. Aplica o Marca-Texto visual roxo moderno
  try {
    const range = selection.getRangeAt(0);
    const mark = document.createElement("mark");
    
    Object.assign(mark.style, {
      backgroundColor: "rgba(129, 140, 248, 0.4)", // Indigo translúcido
      color: "inherit",
      borderRadius: "4px",
      padding: "2px 4px",
      margin: "0 2px"
    });

    range.surroundContents(mark);
    elementosMarcados.push(mark);
  } catch (e) {
    console.warn("[OmniSnap] Não foi possível aplicar o destaque visual, mas o texto foi copiado.");
  }

  // Limpa a faixa azul nativa para a próxima seleção ficar livre
  selection.removeAllRanges();

  return textosAcumulados.length;
}

/**
 * Retorna todos os textos juntos separados por quebra de linha
 */
export function obtenerTextosJuntos(): string {
  return textosAcumulados.join("\n\n");
}

/**
 * Retorna a quantidade de itens salvos atualmente
 */
export function obtenerQuantidadeItens(): number {
  return textosAcumulados.length;
}

/**
 * Limpa toda a lista, limpa o Clipboard e remove os destaques da página
 */
export function limparAcumulador() {
  textosAcumulados = [];
  elementosMarcados.forEach(mark => {
    const parent = mark.parentNode;
    if (parent) {
      parent.replaceChild(document.createTextNode(mark.textContent || ""), mark);
    }
  });
  elementosMarcados = [];
  console.log("[OmniSnap] Lista limpa.");
}