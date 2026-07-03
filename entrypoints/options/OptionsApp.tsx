// entrypoints/options/OptionsApp.tsx
import React, { useState, useEffect, useRef } from 'react';

export type SnippetType = {
  gatilho: string;
  conteudo: string;
};

export default function OptionsApp() {
  const [snippets, setSnippets] = useState<SnippetType[]>([]);
  const [gatilho, setGatilho] = useState('');
  
  // Controle de edição individual
  const [editandoGatilho, setEditandoGatilho] = useState<string | null>(null);
  const [novoGatilhoEdicao, setNovoGatilhoEdicao] = useState('');

  // Referências para capturar o conteúdo HTML digitado nos editores visuais
  const editorCadastroRef = useRef<HTMLDivElement>(null);
  const editoresListagemRef = useRef<{ [key: string]: HTMLDivElement | null }>({});

  useEffect(() => {
    carregarSnippets();
  }, []);

  const carregarSnippets = async () => {
    const result = await browser.storage.local.get('omnisnap_snippets');
    if (result.omnisnap_snippets) {
      setSnippets(result.omnisnap_snippets as SnippetType[]);
    }
  };

  // Atalhos de formatação nativos do Navegador (Negrito, Itálico, Criar Link)
  const executarComandoFormatar = (comando: string, valor: string = '') => {
    if (comando === 'createLink') {
      const url = prompt('Digite a URL do Link (Ex: https://google.com):');
      if (!url) return;
      document.execCommand(comando, false, url);
    } else {
      document.execCommand(comando, false, valor);
    }
  };

  const salvarSnippet = async (e: React.FormEvent) => {
    e.preventDefault();
    const htmlConteudo = editorCadastroRef.current?.innerHTML || '';
    if (!gatilho.trim() || !htmlConteudo.trim() || htmlConteudo === '<br>') return;

    let gatilhoFormatated = gatilho.trim();
    // if (!gatilhoFormatated.startsWith('$') && !gatilhoFormatated.startsWith('-')) {
    //   gatilhoFormatated = '$' + gatilhoFormatated;
    // }

    const novosSnippets = [...snippets.filter(s => s.gatilho !== gatilhoFormatated), {
      gatilho: gatilhoFormatated,
      conteudo: htmlConteudo
    }];

    await browser.storage.local.set({ omnisnap_snippets: novosSnippets });
    setSnippets(novosSnippets);
    setGatilho('');
    if (editorCadastroRef.current) editorCadastroRef.current.innerHTML = '';
  };

  // Inicia o estado de edição preenchendo os campos do card
  const iniciarEdicao = (snip: SnippetType) => {
    setEditandoGatilho(snip.gatilho);
    setNovoGatilhoEdicao(snip.gatilho);
    setTimeout(() => {
      if (editoresListagemRef.current[snip.gatilho]) {
        editoresListagemRef.current[snip.gatilho]!.innerHTML = snip.conteudo;
      }
    }, 50);
  };

  const salvarEdicao = async (gatilhoOriginal: string) => {
    const htmlEditado = editoresListagemRef.current[gatilhoOriginal]?.innerHTML || '';
    if (!novoGatilhoEdicao.trim() || !htmlEditado.trim()) return;

    let gatilhoFormatated = novoGatilhoEdicao.trim();
    if (!gatilhoFormatated.startsWith('$') && !gatilhoFormatated.startsWith('-')) {
      gatilhoFormatated = '$' + gatilhoFormatated;
    }

    // Atualiza mapeando a lista e substituindo o alvo antigo
    const novosSnippets = snippets.map(s => {
      if (s.gatilho === gatilhoOriginal) {
        return { gatilho: gatilhoFormatated, conteudo: htmlEditado };
      }
      return s;
    });

    await browser.storage.local.set({ omnisnap_snippets: novosSnippets });
    setSnippets(novosSnippets);
    cancelarEdicao();
  };

  const cancelarEdicao = () => {
    setEditandoGatilho(null);
    setNovoGatilhoEdicao('');
  };

  const deletarSnippet = async (gatilhoDeletar: string) => {
    const novosSnippets = snippets.filter(s => s.gatilho !== gatilhoDeletar);
    await browser.storage.local.set({ omnisnap_snippets: novosSnippets });
    setSnippets(novosSnippets);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 font-sans">
      <header className="mb-8 border-b border-slate-800 pb-4">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-500 bg-clip-text text-transparent">
          OmniSnap Core
        </h1>
        <p className="text-sm text-slate-400">Gerenciador de Snippets — Formatação Visual Ativa</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Formulário de Cadastro */}
        <form onSubmit={salvarSnippet} className="md:col-span-1 bg-slate-900 border border-slate-800 p-4 rounded-xl h-fit flex flex-col gap-4">
          <h2 className="text-base font-semibold text-slate-200">Novo Snippet</h2>
          
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">Atalho / Gatilho</label>
            <input 
              type="text" 
              placeholder="Ex: $sign ou -links"
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-hidden focus:border-indigo-500 text-slate-100"
              value={gatilho}
              onChange={(e) => setGatilho(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">Conteúdo (Selecione o texto para formatar)</label>
            
            {/* Barra de Ferramentas WYSIWYG */}
            <div className="flex gap-1 bg-slate-950 border border-b-0 border-slate-700 rounded-t-lg p-1.5">
              <button type="button" onClick={() => executarComandoFormatar('bold')} className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-xs font-bold" title="Negrito">B</button>
              <button type="button" onClick={() => executarComandoFormatar('italic')} className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-xs italic" title="Itálico">I</button>
              <button type="button" onClick={() => executarComandoFormatar('underline')} className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-xs underline" title="Sublinhado">U</button>
              <button type="button" onClick={() => executarComandoFormatar('createLink')} className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-xs text-indigo-400" title="Inserir Link">🔗 Link</button>
            </div>

            {/* Div Editável que gera HTML nativamente */}
            <div 
                ref={editorCadastroRef}
                contentEditable
                data-placeholder="Digite sua resposta aqui, selecione palavras para aplicar negritos ou links..."
                className="bg-slate-950 border border-slate-700 rounded-b-lg p-3 text-sm focus:outline-hidden focus:border-indigo-500 text-slate-100 min-h-[120px] max-h-[250px] overflow-y-auto whitespace-pre-wrap leading-relaxed empty:before:content-[attr(data-placeholder)] empty:before:text-slate-500 empty:before:pointer-events-none"
            />
          </div>

          <button type="submit" className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold transition-colors shadow-lg shadow-indigo-600/15 cursor-pointer">
            Salvar Snippet
          </button>
        </form>

        {/* Lista de Snippets */}
        <div className="md:col-span-2 flex flex-col gap-4">
          <h2 className="text-base font-semibold text-slate-200">Meus Snippets ({snippets.length})</h2>
          
          {snippets.length === 0 ? (
            <div className="text-center p-8 bg-slate-900/40 border border-dashed border-slate-800 rounded-xl text-slate-500 text-sm">
              Nenhum snippet cadastrado.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {snippets.map((snip) => {
                const estaEditando = editandoGatilho === snip.gatilho;

                return (
                  <div key={snip.gatilho} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex justify-between items-start gap-4 hover:border-slate-700 transition-colors">
                    <div className="flex flex-col gap-2 flex-1 min-w-0 w-full">
                      
                      {estaEditando ? (
                        /* Interface Ativa no modo de Edição */
                        <div className="flex flex-col gap-2 w-full">
                          <input 
                            type="text"
                            className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-indigo-400 w-fit"
                            value={novoGatilhoEdicao}
                            onChange={(e) => setNovoGatilhoEdicao(e.target.value)}
                          />
                          <div className="flex gap-1 bg-slate-950 border border-b-0 border-slate-700 rounded-t-lg p-1">
                            <button type="button" onClick={() => executarComandoFormatar('bold')} className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-[10px] font-bold">B</button>
                            <button type="button" onClick={() => executarComandoFormatar('italic')} className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-[10px] italic">I</button>
                            <button type="button" onClick={() => executarComandoFormatar('createLink')} className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-[10px] text-indigo-400">🔗 Link</button>
                          </div>
                        <div 
                        ref={(el) => { editoresListagemRef.current[snip.gatilho] = el; }}
                        contentEditable
                        className="bg-slate-950 border border-slate-700 rounded-b-lg p-3 text-sm text-slate-200 focus:outline-hidden min-h-[80px]"
                        />
                          <div className="flex gap-2 mt-1">
                            <button onClick={() => salvarEdicao(snip.gatilho)} className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold cursor-pointer">Salvar</button>
                            <button onClick={cancelarEdicao} className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs cursor-pointer">Cancelar</button>
                          </div>
                        </div>
                      ) : (
                        /* Modo de Exibição Padrão */
                        <>
                          <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-mono font-bold px-2 py-0.5 rounded-md w-fit">
                            {snip.gatilho}
                          </span>
                          {/* Renderiza o HTML interpretado visualmente na listagem */}
                          <div 
                            className="text-sm text-slate-300 p-3 bg-slate-950/40 rounded-lg border border-slate-800/60 leading-relaxed"
                            dangerouslySetInnerHTML={{ __html: snip.conteudo }}
                          />
                        </>
                      )}
                    </div>

                    {!estaEditando && (
                      <div className="flex flex-col gap-2">
                        <button 
                          onClick={() => iniciarEdicao(snip)}
                          className="text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                        >
                          Editar
                        </button>
                        <button 
                          onClick={() => deletarSnippet(snip.gatilho)}
                          className="text-xs font-medium text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                        >
                          Excluir
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}