// entrypoints/content.ts
import { handleSnippets } from '@/utils/snippetHandler';
import { getPageLinks, changeBackgroundColor } from '@/utils/domActions';
import { initGmailMonitor } from '@/utils/gmailMonitor';
import { openCustomSearch } from '@/utils/finderHandler';
import { iniciarMonitorSalesforce } from '@/utils/salesforce';
import { verificarEAcumularSelecao, limparAcumulador, obtenerQuantidadeItens, obtenerTextosJuntos } from '@/utils/selectionAccumulator';

export default defineContentScript({
  // CORREÇÃO: Força o casamento com qualquer subdomínio ou ferramenta embutida (como Genesys/CTI)
  matches: ['<all_urls>'],
  allFrames: true,
  
  main() {
    // Captura o domínio atual para saber onde o script está rodando
    const hostAtual = window.location.hostname;

    // Filtro de segurança: Só executa se estiver nos alvos de trabalho legítimos
    const ehSalesforce = hostAtual.includes("force.com") || hostAtual.includes("salesforce.com");
    const ehGmail = hostAtual.includes("mail.google.com");
    
    // Alvo extra: Verifica se é o frame interno embutido do rascunho de e-mail CTI
    const ehFrameInjetadoEmail = hostAtual.includes("pure.cloud") || hostAtual.includes("genesys");

    if (!ehSalesforce && !ehGmail && !ehFrameInjetadoEmail) {
      return; // Ignora abas externas (Ex: YouTube, Google Search etc.)
    }

    console.log(`🚀 [OmniSnap Core] Ativo no Frame: ${window.location.href}`);

    let refreshIntervalId: any = null;
    let tempoRestanteSegundos = 0;

    // Escuta o mouse na página para acumular com CTRL
    window.addEventListener('mouseup', (event) => {
      verificarEAcumularSelecao(event);
    });

    const atualizarBadgeNavegador = (texto: string) => {
      try {
        browser.runtime.sendMessage({ action: "UPDATE_BADGE", texto });
      } catch (e) {
        console.error("Erro ao atualizar o Badge:", e);
      }
    };

    const iniciarAutoRefresh = (minutos: number) => {
      if (refreshIntervalId) clearInterval(refreshIntervalId);
      tempoRestanteSegundos = minutos * 60;
      formatarEEnviarTempo(tempoRestanteSegundos);
      
      refreshIntervalId = setInterval(() => {
        tempoRestanteSegundos--;
        if (tempoRestanteSegundos <= 0) {
          clearInterval(refreshIntervalId);
          atualizarBadgeNavegador("");
          window.location.reload();
        } else {
          formatarEEnviarTempo(tempoRestanteSegundos);
        }
      }, 1000);
    };

    const formatarEEnviarTempo = (totalSegundos: number) => {
      const min = Math.floor(totalSegundos / 60);
      const seg = totalSegundos % 60;
      const segundosFormatados = seg.toString().padStart(2, '0');
      const textoBadge = `${min}:${segundosFormatados}`;
      browser.runtime.sendMessage({ action: "UPDATE_BADGE", texto: textoBadge, segundosRestantes: totalSegundos });
    };

    const checarTimerSalvo = async () => {
      try {
        const urlLimpo = window.location.hostname;
        const resultado = await browser.storage.local.get(urlLimpo);
        if (resultado[urlLimpo]) {
          iniciarAutoRefresh(resultado[urlLimpo] as number);
        }
      } catch (e) {
        console.error("Erro ao checar Auto-Refresh persistente:", e);
      }
    };

    checarTimerSalvo();

    window.addEventListener('keydown', (event) => {
      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'f') {
        event.preventDefault();
        openCustomSearch();
      }
      // ATALHO 2: Novo atalho para limpar o acumulador e remover as marcações roxas da tela
      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'x') {
        event.preventDefault(); // Impede qualquer comportamento estranho do navegador
        
        limparAcumulador(); // Executa a limpeza da memória e dos destaques visuais
        
        // Atualiza o Badge do ícone da extensão para sumir com o número antigo
        atualizarBadgeNavegador(""); 
        
        console.log("🧹 [OmniSnap] Acumulador limpo via atalho (Ctrl+Shift+X)");
      }
    });

    // --- INICIALIZAÇÃO DOS MONITORES ---
    if (ehGmail) {
      initGmailMonitor();
    } else {
      // Monitora tanto a tela cheia do Salesforce quanto os iframes do console/CTI de e-mail
      iniciarMonitorSalesforce();
    }

    // Interceptador de digitação universal seguro
    window.addEventListener('keyup', (e) => {
      const target = e.target as HTMLElement;
      if (target && (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) {
        handleSnippets(e);
      }
    });

    // Ouvinte de mensagens do Popup
    browser.runtime.onMessage.addListener((message) => {
      if (message.action === "TOTAL_ACUMULADO") {
        const total = obtenerQuantidadeItens();
        return Promise.resolve({ dados: total });
      }
      if (message.action === "PEGAR_TEXTOS_ACUMULADOS") {
        const todosTextos = obtenerTextosJuntos();
        return Promise.resolve({ dados: todosTextos });
      }
      if (message.action === "LIMPAR_ACUMULADOR") {
        limparAcumulador();
        return Promise.resolve({ dados: "Limpo!" });
      }
      if (message.action === "RESTART_TIMER") {
        iniciarAutoRefresh(message.minutos);
        return Promise.resolve({ dados: "Timer iniciado!" });
      }
      if (message.action === "STOP_TIMER") {
        if (refreshIntervalId) {
          clearInterval(refreshIntervalId);
          refreshIntervalId = null;
        }
        atualizarBadgeNavegador("");
        return Promise.resolve({ dados: "Timer parado!" });
      }
      if (message.action === "PEGAR_LINKS") {
        const links = getPageLinks();
        return Promise.resolve({ dados: links });
      }
      if (message.action === "MUDAR_COR") {
        changeBackgroundColor('yellow');
        return Promise.resolve({ dados: "Cor alterada para amarelo!" });
      }
    });
  },
});