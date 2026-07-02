// utils/snippetHandlerGmail.ts

export function handleGmailSnippet(editor: HTMLElement) {
  const selection = window.getSelection();
  if (!selection || !selection.focusNode) return;

  const node = selection.focusNode;
  const content = node.textContent || "";

  // Seus snippets de teste
  const snippets: Record<string, string> = {
    '$sign': 'Best regards,<br><br>Luciano | Docusign Customer Support<br>docusign.com',
    '$ola': 'Olá! Como posso ajudar você hoje?'
  };

  Object.keys(snippets).forEach((trigger) => {
    if (content.endsWith(trigger)) {
      // 1. Calcula onde o gatilho começa
      const offset = content.lastIndexOf(trigger);
      
      // 2. Cria um range cobrindo apenas o gatilho (ex: os 5 caracteres de $sign)
      const range = document.createRange();
      range.setStart(node, offset);
      range.setEnd(node, offset + trigger.length);

      // 3. Seleciona e deleta apenas o gatilho
      selection.removeAllRanges();
      selection.addRange(range);
      range.deleteContents();

      // 4. Insere o texto novo no lugar (preserva o Ctrl+Z e o foco)
      document.execCommand('insertHTML', false, snippets[trigger]);
      
      console.log(`[Gmail] Snippet ${trigger} aplicado com sucesso!`);
    }
  });
}