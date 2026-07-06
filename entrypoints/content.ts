// entrypoints/content.ts
import { handleSnippets } from '@/utils/snippetHandler';
import { getPageLinks, changeBackgroundColor } from '@/utils/domActions';
import { initGmailMonitor } from '@/utils/gmailMonitor';
import { openCustomSearch } from '@/utils/finderHandler';
import { iniciarMonitorSalesforce } from '@/utils/salesforce';
import { verificarEAcumularSelecao, limparAcumulador, obtenerQuantidadeItens, obtenerTextosJuntos } from '@/utils/selectionAccumulator';
import { inicializarSidebarExpansivel } from '@/utils/sidebarDrawer';
import { inicializarTabFinder } from '@/utils/tabfinder';
import { inicializarEnvelopeTemplates } from '@/utils/envelopeTemplates';

export default defineContentScript({
  matches: ['<all_urls>'],
  allFrames: true, // 🌟 ESSENCIAL: força o WXT a injetar o script dentro de cada sub-iframe/CKEditor do Salesforce
  
  main() {
    // PROTEÇÃO: Se o navegador isolar o Iframe e sumir com a API de Extensão, aborta sem quebrar o script
    if (typeof browser === 'undefined' || !browser.runtime || !browser.runtime.id) {
      return;
    }

    console.log(`🚀 [OmniSnap Core] Injetado no contexto: ${window.location.href} (Título: ${document.title})`);

    let refreshIntervalId: any = null;
    let tempoRestanteSegundos = 0;

    // 🌟 VALIDAÇÃO DO DOCUSIGN - RELATÓRIOS (Execução síncrona na carga inicial):
    const urlAtual = window.location.href;
    if (urlAtual.includes("docusign.net/admin/DataReport.aspx") && urlAtual.includes("rpt=EnvelopeID")) {
      console.log("🎯 [OmniSnap] Página de Relatório DocuSign Detectada! Ativando aba flutuante.");
      inicializarSidebarExpansivel();
    }

    // 🌟 MONITOR DE SPA (Single Page Application):
    // Vigia o corpo da página continuamente para capturar a transição assíncrona do React do DocuSign
    const observerSPA = new MutationObserver(() => {
      const urlDinamica = window.location.href;
      
      // Expressão Regular para aceitar tanto apps.docusign.com quanto apps-d.docusign.com
      if (/apps(-d)?\.docusign\.com\/send/.test(urlDinamica)) {
        const targetInput = document.querySelector('input[data-qa="prepare-subject"]');
        
        if (targetInput && !document.getElementById('omnisnap-template-toolbar')) {
          console.log("📝 [OmniSnap SPA Trigger] Inputs localizados no DocuSign! Injetando barra de macros.");
          inicializarEnvelopeTemplates();
        }
      }
    });

    // Ativa o observador no body cobrindo toda a árvore de elementos renderizados
    observerSPA.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Escuta o mouse na página para acumular seleções com CTRL
    window.addEventListener('mouseup', (event) => {
      verificarEAcumularSelecao(event);
    });

    const atualizarBadgeNavegador = (texto: string) => {
      try {
        if (window === window.top && typeof browser !== 'undefined' && browser.runtime && browser.runtime.id) {
          browser.runtime.sendMessage({ action: "UPDATE_BADGE", texto });
        }
      } catch (e) {}
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
      try {
        // Bloqueia os sub-iframes de poluir o cronômetro central
        if (window === window.top) {
          browser.runtime.sendMessage({ action: "UPDATE_BADGE", texto: textoBadge, segundosRestantes: totalSegundos });
        }
      } catch (e) {}
    };

    const checarTimerSalvo = async () => {
      try {
        if (window !== window.top) {
          return;
        }

        const urlLimpo = window.location.hostname;
        const resultado = await browser.storage.local.get(urlLimpo);
        if (resultado[urlLimpo]) {
          console.log(`⏱️ [OmniSnap] Ativando Auto-Refresh persistente para: ${urlLimpo}`);
          iniciarAutoRefresh(resultado[urlLimpo] as number);
        }
      } catch (e) {
        console.error("Erro ao checar Auto-Refresh persistente:", e);
      }
    };

    checarTimerSalvo();

    // Ouvinte nativo direto de teclado (Fura qualquer bloqueio de mensagens assíncronas!)
    window.addEventListener('keydown', (event) => {
      const tecla = event.key.toLowerCase();
      
      // Captura o atalho Ctrl + Shift + Y ou Ctrl + Shift + F em qualquer frame focado
      if (event.ctrlKey && event.shiftKey && (tecla === 'y' || tecla === 'f')) {
        event.preventDefault();
        event.stopPropagation();
        
        console.log("🔍 [OmniSnap Local Trigger] Invocando Finder no frame atual.");
        openCustomSearch(); // Abre direto na tela usando injeção de DOM plano
      }
      
      if (event.ctrlKey && event.shiftKey && tecla === 'x') {
        event.preventDefault();
        limparAcumulador();
        if (window === window.top) {
          atualizarBadgeNavegador("");
        }
      }

      // ATALHO DA BARRA SEPARADA DE BUSCA: Ctrl + Alt + F
      if (event.ctrlKey && event.altKey && tecla === 'f') {
        event.preventDefault();
        event.stopPropagation();
        
        console.log("🔍 [OmniSnap] Ativando Buscador de Abas Separado (TabFinder)");
        inicializarTabFinder();
      }
    });

    // 🌟 INICIALIZAÇÃO AGRESSIVA DE INJECTS POR FRAME:
    const hostAtual = window.location.hostname;
    
    if (hostAtual.includes("mail.google.com")) {
      initGmailMonitor();
    }

    // 🚀 LIÇÃO DA EXTENSÃO VELHA: Força o monitor do Salesforce a rodar em qualquer escopo
    // ou sub-janela aninhada da Service Console que pertença aos domínios force/salesforce
    if (hostAtual.includes("force.com") || hostAtual.includes("salesforce.com")) {
      console.log(`📡 [OmniSnap Engine] Inicializando monitor contínuo no frame: ${window.location.href}`);
      iniciarMonitorSalesforce();
    }

    // Interceptador de digitação universal seguro para os Snippets normais
    window.addEventListener('keyup', (e) => {
      const target = e.target as HTMLElement;
      if (target && (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target.isContentEditable)) {
        handleSnippets(e);
      }
    });

    // Ouvinte de mensagens de segurança do Popup (Apenas se o barramento estiver disponível)
    try {
      browser.runtime.onMessage.addListener((message) => {

        if (message.action === "BUSCAR_SNIPPETS_ATIVOS") {
          return browser.storage.local.get("omnisnap_snippets").then((data) => {
            return { snippets: data.omnisnap_snippets || [] };
          });
        }
        if (message.action === "ABRIR_BUSCA_ATALHO") {
          openCustomSearch();
          return Promise.resolve({ dados: "Buscador disparado!" });
        }
        if (message.action === "TOTAL_ACUMULADO") {
          return Promise.resolve({ dados: obtenerQuantidadeItens() });
        }
        if (message.action === "PEGAR_TEXTOS_ACUMULADOS") {
          return Promise.resolve({ dados: obtenerTextosJuntos() });
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
          return Promise.resolve({ dados: getPageLinks() });
        }
        if (message.action === "MUDAR_COR") {
          changeBackgroundColor('yellow');
          return Promise.resolve({ dados: "Cor alterada!" });
        }
      });
    } catch (err) {}
  },
});