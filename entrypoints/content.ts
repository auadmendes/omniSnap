// entrypoints/content.ts
import { handleSnippets } from '@/utils/snippetHandler';
import { getPageLinks, changeBackgroundColor } from '@/utils/domActions';
import { initGmailMonitor } from '@/utils/gmailMonitor';
import { openCustomSearch } from '@/utils/finderHandler';
// CORREÇÃO: Importando todas as 4 funções que você usa no listener abaixo
// Mude de 'obter' para 'obtener' para sumir o erro ts(2724)
import { verificarEAcumularSelecao, limparAcumulador, obtenerQuantidadeItens, obtenerTextosJuntos } from '@/utils/selectionAccumulator';

export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    console.log('Template WXT Ativo com Módulos!');

    let refreshIntervalId: any = null;
    let tempoRestanteSegundos = 0;

    // Escuta o mouse na página. Se soltar o clique segurando CTRL, acumula e joga pro clipboard!
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
    });

    initGmailMonitor();
    window.addEventListener('keyup', handleSnippets);

    // Ouvinte de mensagens vindo do Popup (Mantido exatamente o seu!)
    browser.runtime.onMessage.addListener((message) => {
      
      if (message.action === "TOTAL_ACUMULADO") {
        // Atualizado para obtener
        const total = obtenerQuantidadeItens();
        return Promise.resolve({ dados: total });
      }

      if (message.action === "PEGAR_TEXTOS_ACUMULADOS") {
        // Atualizado para obtener
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