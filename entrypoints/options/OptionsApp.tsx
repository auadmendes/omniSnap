// entrypoints/options/OptionsApp.tsx
import React, { useState, useEffect, useRef } from 'react';
import { sincronizarDadosPlanilha, salvarSnippetPessoal, compartilharSnippetComTime, SheetSnippet, SheetLink } from '@/utils/sheetsSync';
import { deletarSnippetPessoalDoSheets } from '../../utils/sheetsSync'; 

export type SnippetType = {
  gatilho: string;
  conteudo: string;
};

// Tipo para controlar qual aba do painel está ativa
type TabId = 'personal' | 'shared' | 'links';

export default function OptionsApp() {
  // Controle de Navegação do Painel
  const [abaAtiva, setAbaAtiva] = useState<TabId>('personal');

  // Estados dos dados locais e compartilhados
  const [snippets, setSnippets] = useState<SnippetType[]>([]);
  const [sharedSnippets, setSharedSnippets] = useState<SheetSnippet[]>([]);
  const [sharedLinks, setSharedLinks] = useState<SheetLink[]>([]);

  // Estados de Sincronização e Login Corporativo
  const [emailUser, setEmailUser] = useState('');
  const [syncStatus, setSyncStatus] = useState({ carregando: false, mensagem: '' });

  // Estados do Formulário de Cadastro (Aba Pessoal)
  const [gatilho, setGatilho] = useState('');
  const [editandoGatilho, setEditandoGatilho] = useState<string | null>(null);
  const [novoGatilhoEdicao, setNovoGatilhoEdicao] = useState('');

  // Referências do Editor WYSIWYG
  const editorCadastroRef = useRef<HTMLDivElement>(null);
  const editoresListagemRef = useRef<{ [key: string]: HTMLDivElement | null }>({});

  useEffect(() => {
    carregarDadosLocais();
  }, []);

  const carregarDadosLocais = async () => {
    const result = await browser.storage.local.get([
      'omnisnap_snippets', 
      'omnisnap_shared_snippets', 
      'omnisnap_shared_links',
      'omnisnap_user_email'
    ]);
    
    if (result.omnisnap_snippets) setSnippets(result.omnisnap_snippets as SnippetType[]);
    if (result.omnisnap_shared_snippets) setSharedSnippets(result.omnisnap_shared_snippets as SheetSnippet[]);
    if (result.omnisnap_shared_links) setSharedLinks(result.omnisnap_shared_links as SheetLink[]);
    
    // 🌟 CORREÇÃO AQUI: Forçamos a tipagem para string usando o operador "as string"
    if (result.omnisnap_user_email) {
      setEmailUser(result.omnisnap_user_email as string);
    }
  };

  // Executa o disparo do Sync com a sua URL publicada do Google Sheets
  const executarSincronizacao = async () => {
    if (!emailUser.trim() || !emailUser.includes('@')) {
      setSyncStatus({ carregando: false, mensagem: "❌ Please enter a valid company e-mail." });
      return;
    }
    setSyncStatus({ carregando: true, mensagem: "🔄 Connecting to Google Sheets..." });
    const res = await sincronizarDadosPlanilha(emailUser);
    setSyncStatus({ carregando: false, mensagem: res.sucesso ? `✅ ${res.mensagem}` : `❌ ${res.mensagem}` });
    carregarDadosLocais(); // Atualiza a tela reativamente com os novos dados baixados
  };

  const executarComandoFormatar = (comando: string, valor: string = '') => {
    if (comando === 'createLink') {
      const url = prompt('Enter URL (Ex: https://google.com):');
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

    const gatilhoFormatado = gatilho.trim();
    const novosSnippets = [...snippets.filter(s => s.gatilho !== gatilhoFormatado), {
      gatilho: gatilhoFormatado,
      conteudo: htmlConteudo
    }];

    // Salva no storage local
    await browser.storage.local.set({ omnisnap_snippets: novosSnippets });
    setSnippets(novosSnippets);

    // 🚀 ENVIO EM BACKGROUND: Se o e-mail estiver setado, joga a cópia pra planilha pessoal na nuvem
    if (emailUser.includes('@')) {
      salvarSnippetPessoal(gatilhoFormatado, htmlConteudo, emailUser);
    }

    setGatilho('');
    if (editorCadastroRef.current) editorCadastroRef.current.innerHTML = '';
  };

  // Lógica de Fork: Pega um snippet do time e copia para a sua lista pessoal
  const executarFork = async (sharedSnip: SheetSnippet) => {
    const novosSnippets = [...snippets.filter(s => s.gatilho !== sharedSnip.trigger), {
      gatilho: sharedSnip.trigger,
      conteudo: sharedSnip.content
    }];
    await browser.storage.local.set({ omnisnap_snippets: novosSnippets });
    setSnippets(novosSnippets);
    
    if (emailUser.includes('@')) {
      await salvarSnippetPessoal(sharedSnip.trigger, sharedSnip.content, emailUser);
    }
    alert(`✓ Snippet "${sharedSnip.trigger}" successfully forked to your personal list!`);
  };

  // Lógica de Share: Envia um snippet seu privado para a aba global do time
  const executarShareComTime = async (personalSnip: SnippetType) => {
    if (!emailUser.includes('@')) {
      alert("Please sync your corporate email before sharing.");
      return;
    }
    const confirma = window.confirm(`Do you want to share the snippet "${personalSnip.gatilho}" with the whole team?`);
    if (!confirma) return;

    const res = await compartilharSnippetComTime(personalSnip.gatilho, personalSnip.conteudo, emailUser);
    if (res.sucesso) {
      alert("✓ Submitted! It is now live in the Shared repository.");
      executarSincronizacao();
    } else {
      alert("Error uploading snippet to cloud.");
    }
  };

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

    const gatilhoFormatado = novoGatilhoEdicao.trim();
    const novosSnippets = snippets.map(s => {
      if (s.gatilho === gatilhoOriginal) {
        return { gatilho: gatilhoFormatado, conteudo: htmlEditado };
      }
      return s;
    });

    await browser.storage.local.set({ omnisnap_snippets: novosSnippets });
    setSnippets(novosSnippets);
    
    if (emailUser.includes('@')) {
      salvarSnippetPessoal(gatilhoFormatado, htmlEditado, emailUser);
    }
    cancelarEdicao();
  };

  const cancelarEdicao = () => {
    setEditandoGatilho(null);
    setNovoGatilhoEdicao('');
  };

  const deletarSnippet = async (gatilhoDeletar: string) => {
    // 1. Avisa primeiro o Google Sheets para apagar na nuvem
    if (emailUser && emailUser.includes('@')) {
      console.log("Submetendo ordem de deleção na nuvem para o gatilho:", gatilhoDeletar);
      await deletarSnippetPessoalDoSheets(gatilhoDeletar, emailUser);
    }

    // 2. Apaga do storage local para sumir da tela do navegador
    const novosSnippets = snippets.filter(s => s.gatilho !== gatilhoDeletar);
    await browser.storage.local.set({ omnisnap_snippets: novosSnippets });
    setSnippets(novosSnippets);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 font-sans text-slate-200">
      
      {/* HEADER PRINCIPAL */}
      <header className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-500 bg-clip-text text-transparent">
            OmniSnap Repository Control
          </h1>
          <p className="text-sm text-slate-400">Manage internal text expansions and corporate shortcuts</p>
        </div>
        
        {/* BARRA DE LOGIN E SINCRONIZAÇÃO CORPORATIVA */}
        <div className="flex flex-col gap-1.5 bg-slate-900 border border-slate-800 p-3 rounded-xl min-w-[320px]">
          <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Google Sheets Sync Account</span>
          <div className="flex gap-2">
            <input 
              type="email" 
              placeholder="Enter your corporate email..." 
              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 flex-1 focus:outline-hidden focus:border-indigo-500"
              value={emailUser}
              onChange={(e) => setEmailUser(e.target.value)}
            />
            <button 
              onClick={executarSincronizacao}
              disabled={syncStatus.carregando}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer"
            >
              {syncStatus.carregando ? "Syncing..." : "Sync Now"}
            </button>
          </div>
          {syncStatus.mensagem && <p className="text-[10px] text-slate-400 mt-0.5">{syncStatus.mensagem}</p>}
        </div>
      </header>

      {/* PAINEL CENTRAL EM DUAS COLUNAS (Sidebar esquerda / Conteúdo direita) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* BARRA DE NAVEGAÇÃO LATERAL (SIDEBAR TABS) */}
        <nav className="md:col-span-1 flex flex-col gap-1 bg-slate-900/50 border border-slate-800 p-2 rounded-xl h-fit">
          <button 
            onClick={() => setAbaAtiva('personal')}
            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer ${abaAtiva === 'personal' ? 'bg-indigo-600 text-white shadow-md' : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'}`}
          >
            👤 Personal Snippets
          </button>
          <button 
            onClick={() => setAbaAtiva('shared')}
            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer ${abaAtiva === 'shared' ? 'bg-indigo-600 text-white shadow-md' : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'}`}
          >
            👥 Shared Repository ({sharedSnippets.length})
          </button>
          <button 
            onClick={() => setAbaAtiva('links')}
            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer ${abaAtiva === 'links' ? 'bg-indigo-600 text-white shadow-md' : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'}`}
          >
            🔗 Team Useful Links ({sharedLinks.length})
          </button>
        </nav>

        {/* CONTAINER DO CONTEÚDO DINÂMICO (MUDA CONFORME A ABA ATIVA) */}
        <main className="md:col-span-3">
          
          {/* ABA 1: SNIPPETS PESSOAIS */}
          {abaAtiva === 'personal' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-200">
              {/* Formulário de Cadastro */}
              <form onSubmit={salvarSnippet} className="lg:col-span-1 bg-slate-900 border border-slate-800 p-4 rounded-xl h-fit flex flex-col gap-4">
                <h3 className="text-sm font-bold text-slate-200">Create New Shortcut</h3>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] text-slate-400 uppercase font-semibold">Trigger Shortcut</label>
                  <input 
                    type="text" 
                    placeholder="Ex: ;links or ;cobranca"
                    className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-hidden focus:border-indigo-500 text-slate-100 font-mono"
                    value={gatilho}
                    onChange={(e) => setGatilho(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] text-slate-400 uppercase font-semibold">Content Body</label>
                  <div className="flex gap-1 bg-slate-950 border border-b-0 border-slate-700 rounded-t-lg p-1.5">
                    <button type="button" onClick={() => executarComandoFormatar('bold')} className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-xs font-bold">B</button>
                    <button type="button" onClick={() => executarComandoFormatar('italic')} className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-xs italic">I</button>
                    <button type="button" onClick={() => executarComandoFormatar('underline')} className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-xs underline">U</button>
                    <button type="button" onClick={() => executarComandoFormatar('createLink')} className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-xs text-indigo-400">🔗 Link</button>
                  </div>
                  <div 
                    ref={editorCadastroRef}
                    contentEditable
                    data-placeholder="Write your rich text here..."
                    className="bg-slate-950 border border-slate-700 rounded-b-lg p-3 text-sm focus:outline-hidden focus:border-indigo-500 text-slate-100 min-h-[140px] max-h-[300px] overflow-y-auto whitespace-pre-wrap leading-relaxed empty:before:content-[attr(data-placeholder)] empty:before:text-slate-500 empty:before:pointer-events-none"
                  />
                </div>
                <button type="submit" className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold transition-colors cursor-pointer">
                  Save Local & Cloud
                </button>
              </form>

              {/* Listagem de Snippets */}
              <div className="lg:col-span-2 flex flex-col gap-3">
                {snippets.length === 0 ? (
                  <div className="text-center p-8 bg-slate-900/30 border border-dashed border-slate-800 rounded-xl text-slate-500 text-sm">No shortcuts created yet.</div>
                ) : (
                  snippets.map((snip) => {
                    const estaEditando = editandoGatilho === snip.gatilho;
                    return (
                      <div key={snip.gatilho} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex justify-between items-start gap-4">
                        <div className="flex flex-col gap-2 flex-1 min-w-0">
                          {estaEditando ? (
                            <div className="flex flex-col gap-2 w-full animate-in fade-in duration-150">
                              <input 
                                type="text"
                                className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-indigo-400 w-fit focus:outline-hidden focus:border-indigo-500"
                                value={novoGatilhoEdicao}
                                onChange={(e) => setNovoGatilhoEdicao(e.target.value)}
                              />
                              
                              {/* 🌟 BARRA WYSIWYG REINJETADA: Botões B, I, U e Link específicos para a caixa de edição */}
                              <div className="flex gap-1 bg-slate-950 border border-b-0 border-slate-700 rounded-t-lg p-1.5 w-full">
                                <button type="button" onClick={() => executarComandoFormatar('bold')} className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-xs font-bold" title="Bold">B</button>
                                <button type="button" onClick={() => executarComandoFormatar('italic')} className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-xs italic" title="Italic">I</button>
                                <button type="button" onClick={() => executarComandoFormatar('underline')} className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-xs underline" title="Underline">U</button>
                                <button type="button" onClick={() => executarComandoFormatar('createLink')} className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-xs text-indigo-400" title="Insert Link">🔗 Link</button>
                              </div>
                              
                              {/* Div Editável que agora ganha a borda arredondada apenas embaixo devido à barra superior */}
                              <div 
                                className="bg-slate-950 border border-slate-700 rounded-b-lg p-2 min-h-[100px] max-h-[250px] overflow-y-auto whitespace-pre-wrap leading-relaxed text-sm focus:outline-hidden focus:border-indigo-500 text-slate-100" 
                                ref={(el) => { editoresListagemRef.current[snip.gatilho] = el; }} 
                                contentEditable 
                              />
                              
                              <div className="flex gap-2 mt-1">
                                <button onClick={() => salvarEdicao(snip.gatilho)} className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 font-semibold text-white rounded-lg text-xs cursor-pointer transition-colors">Save</button>
                                <button onClick={cancelarEdicao} className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs cursor-pointer transition-colors">Cancel</button>
                              </div>
                            </div>
                          ) : (
<>
                              <div className="flex items-center gap-2">
                                <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-mono font-bold px-2 py-0.5 rounded-md">{snip.gatilho}</span>
                                <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Private Macro</span>
                              </div>
                              {/* 🌟 CLASSE ATUALIZADA: Adicionado 'break-words' para forçar URLs longas a quebrarem de linha perfeitamente */}
                              <div 
                                className="text-sm text-slate-300 p-3 bg-slate-950/30 rounded-lg border border-slate-800/50 leading-relaxed break-words" 
                                dangerouslySetInnerHTML={{ __html: snip.conteudo }} 
                              />
                            </>
                          )}
                        </div>
                        {!estaEditando && (
                          <div className="flex flex-col gap-1.5 min-w-[85px]">
                            <button onClick={() => iniciarEdicao(snip)} className="w-full text-center text-xs bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded-md transition-colors cursor-pointer">Edit</button>
                            <button onClick={() => executarShareComTime(snip)} className="w-full text-center text-xs bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 px-2 py-1 rounded-md transition-colors font-semibold cursor-pointer">👥 Share</button>
                            <button onClick={() => deletarSnippet(snip.gatilho)} className="w-full text-center text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 px-2 py-1 rounded-md transition-colors cursor-pointer">Delete</button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* ABA 2: SNIPPETS COMPARTILHADOS (TIME) */}
          {abaAtiva === 'shared' && (
            <div className="flex flex-col gap-4 animate-in fade-in duration-200">
              <div className="bg-indigo-600/10 border border-indigo-500/20 p-3 rounded-xl text-xs text-indigo-300 leading-relaxed">
                📢 <b>Global Repository:</b> These macros are approved by managers. Click on <b>"📥 Fork Macro"</b> to copy any shortcut into your personal library.
              </div>
              {sharedSnippets.length === 0 ? (
                <div className="text-center p-12 bg-slate-900/30 border border-dashed border-slate-800 rounded-xl text-slate-500 text-sm">No shared snippets found. Click "Sync Now" above.</div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {sharedSnippets.map((snip) => (
                    <div key={snip.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex justify-between items-start gap-4">
                      <div className="flex flex-col gap-2 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="bg-purple-500/10 text-purple-400 border border-purple-500/20 text-xs font-mono font-bold px-2 py-0.5 rounded-md">{snip.trigger}</span>
                          <span className="text-[10px] text-slate-400">Created by: <code className="text-slate-300">{snip.author || 'System'}</code></span>
                        </div>
                        <div className="text-sm text-slate-300 p-3 bg-slate-950/20 rounded-lg border border-slate-800/40" dangerouslySetInnerHTML={{ __html: snip.content }} />
                      </div>
                      <button 
                        onClick={() => executarFork(snip)}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-3 py-2 rounded-lg transition-all shadow-md shadow-indigo-600/10 cursor-pointer white-space-nowrap"
                      >
                        📥 Fork Macro
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ABA 3: LINKS ÚTEIS */}
          {abaAtiva === 'links' && (
            <div className="flex flex-col gap-4 animate-in fade-in duration-200">
              {sharedLinks.length === 0 ? (
                <div className="text-center p-12 bg-slate-900/30 border border-dashed border-slate-800 rounded-xl text-slate-500 text-sm">No corporate links loaded yet.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {sharedLinks.map((link, idx) => (
                    <div key={idx} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between gap-3 hover:border-indigo-500/30 transition-colors">
                      <div className="flex flex-col gap-1.5">
                        <span className="bg-slate-950 text-slate-400 text-[10px] font-bold px-2 py-0.5 rounded-md w-fit uppercase tracking-wider border border-slate-800">{link.category || "General"}</span>
                        <h4 className="text-sm font-semibold text-slate-100 break-all">{link.description}</h4>
                      </div>
                      <a 
                        href={link.url} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="text-xs text-indigo-400 hover:text-indigo-300 hover:underline break-all flex items-center gap-1 font-mono"
                      >
                        🔗 {link.url}
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </main>
      </div>
    </div>
  );
}