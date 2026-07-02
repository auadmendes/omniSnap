// utils/finderHandler.ts

let highlights: HTMLElement[] = []; 
let currentHighlightIndex = -1;

export function openCustomSearch() {
  let searchBar = document.getElementById("custom-search-bar") as HTMLDivElement;
  if (!searchBar) {
    searchBar = document.createElement("div");
    searchBar.id = "custom-search-bar";
    
    // UI Moderna: Sombra suave, bordas arredondadas e cores profissionais
    Object.assign(searchBar.style, {
      position: "fixed",
      top: "16px",
      left: "50%",
      transform: "translateX(-50%)",
      backgroundColor: "#ffffff",
      color: "#1e293b",
      padding: "8px 12px",
      border: "1px solid #e2e8f0",
      borderRadius: "12px",
      boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05), 0 0 0 1px rgba(0, 0, 0, 0.02)",
      zIndex: "2147483647", // Garante ficar acima de qualquer elemento do site
      display: "flex",
      alignItems: "center",
      gap: "8px",
      fontFamily: "system-ui, -apple-system, sans-serif",
      fontSize: "14px",
      boxSizing: "border-box"
    });

    // Remodelamos a barra usando ícones e botões minimalistas e modernos
    searchBar.innerHTML = `
      <span id="drag-handle" style="cursor: grab; padding: 4px; user-select: none; color: #94a3b8; font-size: 16px; display: flex; align-items: center;">⠿</span>
      
      <input type="text" id="custom-search-input" placeholder="Buscar palavras separadas por vírgula..." 
        style="width: 260px; padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px; outline: none; background: #f8fafc; color: #0f172a; transition: border-color 0.15s ease;">
      
      <span id="custom-search-counter" style="font-size: 12px; color: #64748b; min-width: 45px; text-align: center; font-variant-numeric: tabular-nums; font-weight: 500;">0/0</span>
      
      <div style="display: flex; gap: 4px; align-items: center; border-left: 1px solid #e2e8f0; padding-left: 8px;">
        <button id="custom-prev-btn" title="Anterior" style="border: none; background: none; padding: 6px 8px; cursor: pointer; border-radius: 6px; color: #475569; display: flex; align-items: center;">⬆</button>
        <button id="custom-next-btn" title="Próximo" style="border: none; background: none; padding: 6px 8px; cursor: pointer; border-radius: 6px; color: #475569; display: flex; align-items: center;">⬇</button>
      </div>

      <button id="custom-search-btn" style="background: #4f46e5; color: white; border: none; padding: 6px 14px; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 500; transition: background 0.15s ease;">Buscar</button>
      <button id="custom-clear-btn" style="background: none; border: 1px solid #e2e8f0; color: #475569; padding: 5px 12px; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 500; transition: all 0.15s ease;">Limpar</button>
      
      <button id="custom-close-btn" style="background: none; border: none; cursor: pointer; font-size: 16px; color: #94a3b8; padding: 4px; display: flex; align-items: center; margin-left: 4px; transition: color 0.15s ease;">×</button>
    `;
    document.body.appendChild(searchBar);

    const input = document.getElementById("custom-search-input") as HTMLInputElement;
    const counter = document.getElementById("custom-search-counter") as HTMLElement;
    const searchBtn = document.getElementById("custom-search-btn") as HTMLButtonElement;
    const clearBtn = document.getElementById("custom-clear-btn") as HTMLButtonElement;
    const closeBtn = document.getElementById("custom-close-btn") as HTMLButtonElement;
    const prevBtn = document.getElementById("custom-prev-btn") as HTMLButtonElement;
    const nextBtn = document.getElementById("custom-next-btn") as HTMLButtonElement;

    input.focus();

    // Pequenos efeitos de Hover/Focus dinâmicos via JS para manter o isolamento
    input.addEventListener("focus", () => input.style.borderColor = "#4f46e5");
    input.addEventListener("blur", () => input.style.borderColor = "#cbd5e1");
    searchBtn.addEventListener("mouseover", () => searchBtn.style.background = "#4338ca");
    searchBtn.addEventListener("mouseout", () => searchBtn.style.background = "#4f46e5");
    clearBtn.addEventListener("mouseover", () => { clearBtn.style.background = "#f1f5f9"; clearBtn.style.borderColor = "#cbd5e1"; });
    clearBtn.addEventListener("mouseout", () => { clearBtn.style.background = "none"; clearBtn.style.borderColor = "#e2e8f0"; });
    closeBtn.addEventListener("mouseover", () => closeBtn.style.color = "#475569");
    closeBtn.addEventListener("mouseout", () => closeBtn.style.color = "#94a3b8");
    [prevBtn, nextBtn].forEach(btn => {
      btn.addEventListener("mouseover", () => btn.style.background = "#f1f5f9");
      btn.addEventListener("mouseout", () => btn.style.background = "none");
    });

    // Eventos ativos
    searchBtn.addEventListener("click", () => highlightSearch(input.value, counter));
    clearBtn.addEventListener("click", () => clearHighlights(counter));
    
    closeBtn.addEventListener("click", () => {
      clearHighlights(counter);
      searchBar.remove();
    });

    prevBtn.addEventListener("click", () => navigateHighlights(-1, counter));
    nextBtn.addEventListener("click", () => navigateHighlights(1, counter));

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        highlightSearch(input.value, counter);
      }
    });

    makeDraggable(searchBar);
  } else {
    (document.getElementById("custom-search-input") as HTMLInputElement).focus();
  }
}

function makeDraggable(element: HTMLElement) {
  const dragHandle = document.getElementById("drag-handle") as HTMLElement;
  let offsetX = 0, offsetY = 0, isDragging = false;
  
  dragHandle.addEventListener("mousedown", (event) => {
    isDragging = true;
    offsetX = event.clientX - element.getBoundingClientRect().left;
    offsetY = event.clientY - element.getBoundingClientRect().top;
    dragHandle.style.cursor = "grabbing";
  });
  
  document.addEventListener("mousemove", (event) => {
    if (!isDragging) return;
    element.style.left = `${event.clientX - offsetX}px`;
    element.style.top = `${event.clientY - offsetY}px`;
    element.style.transform = "none";
  });
  
  document.addEventListener("mouseup", () => {
    isDragging = false;
    dragHandle.style.cursor = "grab";
  });
}

function removerAcentos(texto: string): string {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function highlightSearch(query: string, counterElement: HTMLElement) {
  // Limpa profundamente e reconstrói a estrutura contínua do HTML da página
  clearHighlights(counterElement);
  highlights = [];
  currentHighlightIndex = -1;

  // Extrai as palavras chaves separadas por vírgula
  let words = query
    .split(",")
    .map(word => word.trim())
    .filter(word => word.length > 0);

  if (words.length === 0) {
    updateCounter(counterElement);
    return;
  }

  // Filtra duplicados exatos
  words = [...new Set(words)];

  // Filtra subtermos redundantes (Se buscou "Ale" e "Alexia", mantém apenas "Ale")
  words = words.filter((wordAtual, index) => {
    return !words.some((outraWord, outroIndex) => {
      if (index === outroIndex) return false;
      return wordAtual.toLowerCase().includes(outraWord.toLowerCase()) && wordAtual.length > outraWord.length;
    });
  });

  // Ordena do maior termo para o menor
  words.sort((a, b) => b.length - a.length);

  // Paleta de cores padrão
  const colors = [
    "#ffff00", "#ffb3b3", "#b3ffb3", "#b3b3ff", "#ff66ff",
    "#ffa500", "#00ffff", "#c0c0c0", "#cc99ff", "#ff6666"
  ];

  // --- NOVA ESTRUTÚRA EVOLUÍDA: Execução unificada via RegEx (OR) ---
  // Compilamos todas as palavras válidas em um único motor de busca unificado
  const termosProntos = words.map(w => escapeRegExp(removerAcentos(w)));
  const regexGlobal = new RegExp(`(${termosProntos.join("|")})`, "gi");

  // Criamos um mapa de cores rápido para saber qual cor injetar dinamicamente em cada termo
  const mapaCores = new Map<string, string>();
  words.forEach((w, idx) => {
    mapaCores.set(removerAcentos(w).toLowerCase(), colors[idx % colors.length]);
  });

  // --- PARTE A: Varredura e Substituição Unificada nos TextNodes (HTML) ---
  function replaceTextWithSpan(node: Node) {
    if (node.parentElement?.closest("#custom-search-bar")) return;

    if (node.nodeType === Node.TEXT_NODE && node.nodeValue) {
      const textoNodeSemAcento = removerAcentos(node.nodeValue);
      
      // Testamos se o nó de texto possui QUALQUER uma das palavras chaves mapeadas
      if (regexGlobal.test(textoNodeSemAcento)) {
        const span = document.createElement("span");
        
        // Substituição dinâmica injetando as cores corretas por palavra correspondente
        span.innerHTML = node.nodeValue.replace(regexGlobal, (match) => {
          const chaveCor = removerAcentos(match).toLowerCase();
          // Procura se o termo completo ou uma parte dele bate com o nosso mapa de cores
          let corEscolhida = colors[0];
          for (const [termoSalvo, cor] of mapaCores.entries()) {
            if (chaveCor.includes(termoSalvo) || termoSalvo.includes(chaveCor)) {
              corEscolhida = cor;
              break;
            }
          }
          return `<mark style="background-color: ${corEscolhida}; color: #000; border-radius: 2px;">${match}</mark>`;
        });
        
        node.parentNode?.replaceChild(span, node);
        
        span.querySelectorAll("mark").forEach((mark) => {
          highlights.push(mark as HTMLElement);
        });
      }
    } else {
      Array.from(node.childNodes).forEach(replaceTextWithSpan);
    }
  }
  document.body.childNodes.forEach(replaceTextWithSpan);

  // --- PARTE B: Varredura nos Inputs e Textareas ---
  const camposDeTexto = document.querySelectorAll('input[type="text"], textarea');
  camposDeTexto.forEach((campo) => {
    const elemento = campo as HTMLInputElement | HTMLTextAreaElement;
    if (elemento.id === "custom-search-input") return;

    const valorSemAcento = removerAcentos(elemento.value);
    
    if (regexGlobal.test(valorSemAcento)) {
      // Descobre qual cor aplicar baseada no match interno do input
      let corInput = colors[0];
      for (const [termoSalvo, cor] of mapaCores.entries()) {
        if (valorSemAcento.toLowerCase().includes(termoSalvo)) {
          corInput = cor;
          break;
        }
      }
      
      elemento.style.borderColor = corInput;
      elemento.style.backgroundColor = `${corInput}15`;
      elemento.style.boxShadow = `0 0 0 3px ${corInput}40`;
      highlights.push(elemento);
    }
  });

  if (highlights.length > 0) {
    currentHighlightIndex = 0;
    focusHighlight(counterElement);
  } else {
    updateCounter(counterElement);
  }
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function clearHighlights(counterElement: HTMLElement) {
  // 1. Desfaz e remove os marks injetados no HTML
  document.querySelectorAll("mark").forEach(mark => {
    const parent = mark.parentNode;
    if (parent) {
      parent.replaceChild(document.createTextNode(mark.textContent || ""), mark);
    }
  });

  // MÁGICA DO REFRESH INTERNO: Junta os fragmentos de texto do site de volta em blocos contínuos!
  document.body.normalize();

  // 2. Localiza e reseta as estilizações aplicadas sobre inputs e textareas do site
  const camposDeTexto = document.querySelectorAll('input[type="text"], textarea');
  camposDeTexto.forEach((campo) => {
    const elemento = campo as HTMLInputElement | HTMLTextAreaElement;
    if (elemento.id === "custom-search-input") return;
    
    elemento.style.borderColor = "";
    elemento.style.backgroundColor = "";
    elemento.style.boxShadow = "";
    elemento.style.outline = "";
  });

  highlights = [];
  currentHighlightIndex = -1;
  updateCounter(counterElement);
}

function updateCounter(counterElement: HTMLElement) {
  const current = highlights.length > 0 ? currentHighlightIndex + 1 : 0;
  counterElement.textContent = `${current}/${highlights.length}`;
}

function focusHighlight(counterElement: HTMLElement) {
  if (highlights.length === 0) return;
  
  const target = highlights[currentHighlightIndex];
  
  // Limpa focos e contornos residuais de navegações anteriores
  highlights.forEach(h => h.style.outline = "none");
  
  // Injeta o foco Indigo padrão do OmniSnap
  target.style.outline = "2px solid #4f46e5";
  if (target.tagName === "MARK") {
    target.style.outlineOffset = "2px";
  }
  
  target.scrollIntoView({ behavior: "smooth", block: "center" });
  updateCounter(counterElement);
}

function navigateHighlights(direction: number, counterElement: HTMLElement) {
  if (highlights.length === 0) return;

  if (currentHighlightIndex >= 0 && currentHighlightIndex < highlights.length) {
    highlights[currentHighlightIndex].style.outline = "none";
  }

  currentHighlightIndex += direction;
  if (currentHighlightIndex < 0) currentHighlightIndex = highlights.length - 1;
  if (currentHighlightIndex >= highlights.length) currentHighlightIndex = 0;

  focusHighlight(counterElement);
}