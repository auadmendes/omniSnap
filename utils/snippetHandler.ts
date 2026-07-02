export const handleSnippets = (event: KeyboardEvent) => {
  const element = event.target as HTMLInputElement | HTMLTextAreaElement;

  // Verifica se o alvo é um campo onde se pode digitar
  const isInput = element.tagName === 'INPUT' || element.tagName === 'TEXTAREA' || element.isContentEditable;
  
  if (!isInput) return;

  // Simulação de banco de dados (o que depois virá do Mongo)
  const snippets: Record<string, string> = {
    '$sign': 'Best regards,\n\nLuciano | Docusign Customer Support\ndocusign.com',
    '$ola': 'Olá! Como posso ajudar você hoje?'
  };

  // Pegamos o valor atual do campo
  const valor = element.isContentEditable ? element.innerText : element.value;

  // Se o usuário digitou um dos nossos gatilhos
  Object.keys(snippets).forEach((trigger) => {
    if (valor.endsWith(trigger)) {
      const novoTexto = valor.replace(trigger, snippets[trigger]);

      if (element.isContentEditable) {
        element.innerText = novoTexto;
        // Colocar o cursor no final (opcional para campos complexos)
      } else {
        element.value = novoTexto;
      }
      
      console.log(`[Snippet] Substituído: ${trigger}`);
    }
  });
};