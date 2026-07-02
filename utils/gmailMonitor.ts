// utils/gmailMonitor.ts
import { handleGmailSnippet } from './snippetHandlerGmail';

export function initGmailMonitor() {
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach((node) => {
        if (node instanceof HTMLElement) {
          // Procura o campo de texto do Gmail
          const editor = node.querySelector('div[role="textbox"][contenteditable="true"]');
          if (editor instanceof HTMLElement && !editor.dataset.listenerAttached) {
            editor.dataset.listenerAttached = "true";
            
            // Adiciona o evento de teclado
            editor.addEventListener('keyup', (e) => {
              // Só dispara se a tecla for uma letra, espaço ou enter
              if (e.key.length === 1 || e.key === 'Enter') {
                handleGmailSnippet(editor);
              }
            });
          }
        }
      });
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}