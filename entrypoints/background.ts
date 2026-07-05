// entrypoints/background.ts

export default defineBackground(() => {
  console.log('Hello background!', { id: browser.runtime.id });

  // Ouvinte de comandos de atalho globais de teclado (gerenciados pelo manifest)
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
  
  // 🌟 CENTRALIZADO: Apenas UM onMessage listener gerencia todo o fluxo de dados da extensão
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    
    // 1. Gerenciador do Contador e Cores do Badge
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
        corBadge = "#ef4444"; // Últimos 10 segundos: Vermelho vivo de urgência
      } else if (segundos <= 120) {
        corBadge = "#f97316"; // Menos de 2 minutos: Laranja de atenção
      }

      // Aplica a cor estilizada ao badge daquela aba específica
      browser.action.setBadgeBackgroundColor({
        color: corBadge,
        tabId: tabId
      });
    }

    // 2. Busca Trans-Domínio de Palavras em Multi-Abas (TabFinder)
    if (message.action === "SEARCH_ALL_TABS") {
      const termoBusca = message.termo.toLowerCase().trim();
      
      // Consulta todas as abas abertas na janela atual do navegador
      browser.tabs.query({ currentWindow: true }).then(async (tabs) => {
        const abasEncontradas: Array<{ id: number, title: string, url: string }> = [];

        for (const tab of tabs) {
          // Ignora a aba de onde a busca partiu, abas do sistema ou sem URL válida
          if (!tab.id || tab.id === sender.tab?.id || !tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('about:')) {
            continue;
          }

          try {
            // O SEGREDO: O Background injeta e lê o DOM de forma nativa e direta na aba vizinha,
            // forçando a varredura em todos os frames e inputs sem depender do content script de lá!
            const resultados = await browser.scripting.executeScript({
              target: { tabId: tab.id, allFrames: true },
              func: (termo: string) => {
                const textoCorpo = (document.body?.innerText || "").toLowerCase();
                const textoInputs = Array.from(document.getElementsByTagName("input"))
                  .map(input => (input.value || "").toLowerCase())
                  .join(" ");
                
                return textoCorpo.includes(termo) || textoInputs.includes(termo);
              },
              args: [termoBusca]
            });

            // Se algum dos frames daquela aba retornou verdadeiro para a palavra, nós a salvamos
            const termoExisteNaAba = resultados.some(r => r.result === true);

            if (termoExisteNaAba) {
              abasEncontradas.push({
                id: tab.id,
                title: tab.title || "Data Report Page",
                url: tab.url
              });
            }
          } catch (err) {
            // Ignora erros em abas protegidas por segurança nativa do Chrome (Ex: Web Store)
          }
        }

        // Retorna os dados mapeados para o TabFinder
        sendResponse({ dados: abasEncontradas });
      }).catch(err => {
        console.error("Erro ao pesquisar abas:", err);
        sendResponse({ dados: [] });
      });

      return true; // Mantém o canal assíncrono ativo para processar o sendResponse
    }

    // 3. Focar/Mudar para a aba selecionada na lista do TabFinder
    if (message.action === "FOCUS_TAB") {
      browser.tabs.update(message.tabId, { active: true });
      return true;
    }
  });

});