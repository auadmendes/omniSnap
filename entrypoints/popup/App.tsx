// entrypoints/popup/App.tsx
import { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [tempoInput, setTempoInput] = useState<string>("");
  const [timerAtivo, setTimerAtivo] = useState<number | null>(null);
  const [itensColetados, setItensColetados] = useState<number>(0);

  // Função isolada para buscar o total atualizado da página de forma confiável
  const sincronizarQuantidadeColetada = async (tabId: number) => {
    try {
      const response = await browser.tabs.sendMessage(tabId, { action: "TOTAL_ACUMULADO" });
      if (response && typeof response.dados === 'number') {
        setItensColetados(response.dados);
      }
    } catch (e) {
      console.warn("[OmniSnap Popup] Script de conteúdo ainda não respondeu ao contador.");
    }
  };

  useEffect(() => {
    const carregarDadosAba = async () => {
      try {
        const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
        if (!tab?.url || !tab?.id) return;

        // 1. Carrega o estado persistente do Timer
        const urlLimpo = new URL(tab.url).hostname;
        const resultado = await browser.storage.local.get(urlLimpo);
        if (resultado[urlLimpo]) {
          setTimerAtivo(resultado[urlLimpo] as number);
        }

        // 2. Executa a sincronização instantânea do acumulador
        await sincronizarQuantidadeColetada(tab.id);
      } catch (e) {
        console.error(e);
      }
    };

    carregarDadosAba();
  }, []);

  const gerenciarAcumulador = async (acao: string) => {
    try {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) return;

      const response = await browser.tabs.sendMessage(tab.id, { action: acao });

      if (acao === "PEGAR_TEXTOS_ACUMULADOS") {
        if (response?.dados) {
          await navigator.clipboard.writeText(response.dados);
          alert("Todos os blocks foram copiados juntos com sucesso!");
        } else {
          alert("Nenhum texto acumulado nesta página.");
        }
      }

      if (acao === "LIMPAR_ACUMULADOR") {
        setItensColetados(0);
        alert("Lista de cópia limpa.");
      }

      // CORREÇÃO: Após qualquer clique, força o re-check do contador para atualizar o layout do React
      await sincronizarQuantidadeColetada(tab.id);
    } catch (e) {
      alert("Erro: Recarregue a página (F5) para ativar o script.");
    }
  };

  const executarAcaoLinks = async () => {
    try {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) return;
      const response = await browser.tabs.sendMessage(tab.id, { action: "PEGAR_LINKS" });
      if (response?.dados) {
        await navigator.clipboard.writeText(response.dados);
        alert("Todos os links copiados!");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const salvarTimer = async (minutos: number) => {
    if (minutos <= 0 || isNaN(minutos)) return;
    try {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (!tab?.url || !tab?.id) return;
      const urlLimpo = new URL(tab.url).hostname;
      await browser.storage.local.set({ [urlLimpo]: minutos });
      setTimerAtivo(minutos);
      await browser.tabs.sendMessage(tab.id, { action: "RESTART_TIMER", minutos });
    } catch (e) {
      alert("Recarregue a página antes de setar o timer.");
    }
  };

  const limparTimer = async () => {
    try {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (!tab?.url || !tab?.id) return;
      const urlLimpo = new URL(tab.url).hostname;
      await browser.storage.local.remove(urlLimpo);
      setTimerAtivo(null);
      setTempoInput("");
      await browser.tabs.sendMessage(tab.id, { action: "STOP_TIMER" });
    } catch (e) {
      console.error(e);
    }
  };

  const abrirPaginaOpcoes = () => {
    browser.tabs.create({
      url: browser.runtime.getURL('/options.html')
    });
  };

  return (
    <div className="w-[350px] p-4 bg-slate-900 text-slate-100 font-sans antialiased flex flex-col gap-4">
      {/* Header */}
      <header className="border-b border-slate-800 pb-2">
        <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-500 bg-clip-text text-transparent">
          OmniSnap
        </h1>
        <p className="text-xs text-slate-400">Produtividade e Automação</p>
      </header>

      {/* Seção do Timer */}
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-slate-300">Auto Refresh (Esta Aba)</h2>
        <div className="bg-slate-800/50 border border-slate-800 p-3 rounded-xl">
          {timerAtivo ? (
            <div className="flex flex-col items-center gap-2 text-center">
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full">
                Ativo
              </span>
              <p className="text-sm text-slate-300">
                Atualizando a cada <strong className="text-slate-100">{timerAtivo} min</strong>
              </p>
              <button 
                className="w-full mt-1 py-1.5 text-xs font-medium text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg transition-colors cursor-pointer" 
                onClick={limparTimer}
              >
                Parar Atualização
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              <div className="grid grid-cols-3 gap-2">
                <button 
                  className="py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 border border-slate-700/50 rounded-lg transition-colors cursor-pointer" 
                  onClick={() => salvarTimer(5)}
                >
                  5m
                </button>
                <button 
                  className="py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 border border-slate-700/50 rounded-lg transition-colors cursor-pointer" 
                  onClick={() => salvarTimer(10)}
                >
                  10m
                </button>
                <button 
                  className="py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 border border-slate-700/50 rounded-lg transition-colors cursor-pointer" 
                  onClick={() => salvarTimer(15)}
                >
                  15m
                </button>
              </div>
              <div className="flex gap-2">
                <input 
                  type="number" 
                  placeholder="Customizado (min)..." 
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 transition-colors"
                  value={tempoInput}
                  onChange={(e) => setTempoInput(e.target.value)}
                />
                <button 
                  className="px-4 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors cursor-pointer shadow-md shadow-indigo-600/10" 
                  onClick={() => salvarTimer(Number(tempoInput))}
                >
                  Setar
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Seção: Acumulador por Tecla */}
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-slate-300">
          Textos Coletados ({itensColetados})
        </h2>
        <div className="flex flex-col gap-2">
          <div className="text-[11px] text-slate-400 leading-relaxed bg-slate-950/40 p-2 rounded-lg border border-slate-800/60">
            💡 Segure a tecla <kbd className="bg-slate-800 text-slate-200 px-1.5 py-0.5 rounded-sm border border-slate-700 text-[10px] font-mono shadow-xs">Ctrl</kbd> na página enquanto seleciona os blocks com o mouse para acumulá-los.
          </div>

          {/* MELHORIA: O botão agora destrava visualmente na mesma hora se houver mais que 0 itens */}
          <button 
            className={`w-full p-2.5 border rounded-xl flex items-center gap-3 text-left transition-all cursor-pointer group ${
              itensColetados > 0 
                ? 'bg-slate-800/80 border-indigo-500 text-white shadow-md shadow-indigo-500/10 hover:bg-slate-800' 
                : 'bg-slate-800/20 border-slate-800 opacity-40 pointer-events-none'
            }`} 
            onClick={() => gerenciarAcumulador("PEGAR_TEXTOS_ACUMULADOS")}
          >
            <span className="text-lg bg-slate-950 p-1.5 rounded-lg group-hover:scale-105 transition-transform">📋</span>
            <div className="flex flex-col">
              <span className={`text-xs font-semibold ${itensColetados > 0 ? 'text-indigo-400' : 'text-slate-400'}`}>Copiar Tudo Coletado</span>
              <span className="text-[10px] text-slate-500">Junta os blocks salvos via Ctrl</span>
            </div>
          </button>

          {itensColetados > 0 && (
            <button 
              className="w-full mt-1 py-1.5 bg-transparent border border-dashed border-red-500/30 hover:border-red-500 text-[11px] font-semibold text-red-400 hover:bg-red-500/5 **update-fade** rounded-lg transition-all cursor-pointer" 
              onClick={() => gerenciarAcumulador("LIMPAR_ACUMULADOR")}
            >
              Limpar Lista e Highlights
            </button>
          )}
        </div>
      </section>

      {/* Outras Ferramentas */}
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-slate-300">Outros Recursos</h2>
        <div className="flex flex-col gap-2">
          <button 
            className="w-full p-2.5 bg-slate-800/40 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-xl flex items-center gap-3 text-left transition-all cursor-pointer group" 
            onClick={executarAcaoLinks}
          >
            <span className="text-lg bg-slate-950 p-1.5 rounded-lg group-hover:scale-105 transition-transform">🔗</span>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-slate-200 group-hover:text-indigo-400 transition-colors">Copiar Links</span>
              <span className="text-[10px] text-slate-500">Pega todos os URLs da página</span>
            </div>
          </button>
        </div>
      </section>

      {/* Seção: Painel de Controle */}
      <section className="flex flex-col gap-2 mt-1 border-t border-slate-800/60 pt-3">
        <button 
          className="w-full p-2 bg-slate-950 hover:bg-slate-950/40 border border-slate-800 hover:border-indigo-500/30 text-xs font-semibold text-slate-400 hover:text-indigo-400 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer" 
          onClick={abrirPaginaOpcoes}
        >
          <span>⚙️</span> Gerenciar Meus Snippets
        </button>
      </section>
    </div>
  );
}

export default App;