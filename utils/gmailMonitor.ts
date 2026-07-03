// utils/gmailMonitor.ts
import { handleSnippets } from './snippetHandler'; // 👈 AGORA IMPORTA O MOTOR CORRETO!

export function initGmailMonitor() {
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach((node) => {
        if (node instanceof HTMLElement) {
          // Localiza a caixa de composição do Gmail ativa
          const editor = node.querySelector('div[role="textbox"][contenteditable="true"]');
          if (editor instanceof HTMLElement && !editor.dataset.listenerAttached) {
            editor.dataset.listenerAttached = "true";
            
            // Adiciona o listener interceptando o evento completo
            editor.addEventListener('keyup', (e) => {
              // Só dispara para caracteres comuns, espaço ou Enter
              if (e.key.length === 1 || e.key === 'Enter') {
                // Passamos o evento completo (e) para que o handleSnippets saiba quem é o target
                handleSnippets(e); 
              }
            });
          }
        }
      });
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}