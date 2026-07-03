// entrypoints/background.ts

export default defineBackground(() => {
  console.log('Hello background!', { id: browser.runtime.id });

  browser.commands.onCommand.addListener(async (command) => {
    if (command === "abrir-busca-customizada") {
      try {
        // Pega a aba que o usuário está olhando no momento
        const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
        
        if (tab?.id) {
          // Envia a mensagem direta para o content script daquela aba
          browser.tabs.sendMessage(tab.id, { action: "ABRIR_BUSCA_ATALHO" });
          console.log(`🚀 [OmniSnap] Comando enviado para a aba ${tab.id}`);
        }
      } catch (error) {
        console.error("❌ [OmniSnap] Erro ao disparar comando para a aba:", error);
      }
    }
  });
  
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