// entrypoints/background.ts

export default defineBackground(() => {
  console.log('Hello background!', { id: browser.runtime.id });

  browser.runtime.onMessage.addListener((message, sender) => {
    if (message.action === "UPDATE_BADGE" && sender.tab?.id) {
      const tabId = sender.tab.id;
      const segundos = message.segundosRestantes;

      // Define o texto do contador (Ex: 9:58)
      browser.action.setBadgeText({
        text: message.texto,
        tabId: tabId
      });
      
      // Lógica de Cores Dinâmicas baseada no tempo restante
      let corBadge = "#4f46e5"; // Padrão: Azul Indigo (Mais de 2 minutos)

      if (segundos <= 10) {
        // Últimos 10 segundos: Vermelho vivo de urgência
        corBadge = "#ef4444"; 
      } else if (segundos <= 120) {
        // Menos de 2 minutos: Laranja de atenção
        corBadge = "#f97316"; 
      }

      // Aplica a cor estilizada ao badge daquela aba específica
      browser.action.setBadgeBackgroundColor({
        color: corBadge,
        tabId: tabId
      });
    }
  });
});