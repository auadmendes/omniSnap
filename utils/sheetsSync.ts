// utils/sheetsSync.ts

// 🔗 URL do seu Web App atualizado do Google Apps Script
const APPS_SCRIPT_URL = "https://script.google.com/a/macros/docusign.com/s/AKfycbz7sp5gPRIzMehDLPryzyCHnC3B59l2Jo7mzZQCJCadkruuvdZSsmqN12qA20l1RkGo/exec";

export interface SheetSnippet {
  id: string;
  trigger: string;
  content: string;
  author?: string; // Presente apenas nos compartilhados
}

export interface SheetLink {
  url: string;
  description: string;
  category: string;
}

/**
 * 🔄 Baixa todos os dados da planilha e atualiza o storage local da extensão
 */
export async function sincronizarDadosPlanilha(email: string): Promise<{ sucesso: boolean; mensagem: string }> {
  if (!email || !email.includes("@")) {
    return { sucesso: false, mensagem: "Invalid or empty e-mail address." };
  }

  try {
    const emailFormatado = email.toLowerCase().trim();
    
    // 1. Pegamos o que o usuário JÁ TEM guardado localmente na extensão antes do sync
    const storageAtual = await browser.storage.local.get(['omnisnap_snippets']);
    const snippetsLocaisAntigos = (storageAtual.omnisnap_snippets || []) as any[];

    // 2. Busca os dados mais recentes do Google Sheets
    const urlBusca = `${APPS_SCRIPT_URL}?action=GET_DATA&email=${encodeURIComponent(emailFormatado)}&t=${Date.now()}`;
    const response = await fetch(urlBusca);
    
    if (!response.ok) throw new Error("Network response was not ok");
    
    const data = await response.json();
    if (data.erro) return { sucesso: false, mensagem: data.erro };

    const snippetsVindosDoSheets = (data.personal || []).map((s: any) => ({
      gatilho: s.trigger,
      conteudo: s.content
    }));

    // 3. 🧠 LÓGICA DE MESCLAGEM (MERGE):
    const mapaMesclado = new Map();
    
    snippetsLocaisAntigos.forEach(snip => {
      if (snip.gatilho) mapaMesclado.set(snip.gatilho, snip);
    });
    
    snippetsVindosDoSheets.forEach((snip: any) => {
      if (snip.gatilho) mapaMesclado.set(snip.gatilho, snip);
    });

    const listaFinalPersonal = Array.from(mapaMesclado.values());

    // 4. Grava tudo atualizado de forma segura
    await browser.storage.local.set({
      omnisnap_user_email: emailFormatado,
      omnisnap_snippets: listaFinalPersonal,
      omnisnap_shared_snippets: data.shared || [], 
      omnisnap_shared_links: data.links || []      
    });

    return { 
      sucesso: true, 
      mensagem: `Sync completed! Preserved/Merged local snippets. Now displaying ${listaFinalPersonal.length} personal shortcuts.` 
    };

  } catch (error) {
    console.error("[OmniSnap Sync Error]", error);
    return { sucesso: false, mensagem: "Failed to connect to corporate server. Check your connection." };
  }
}

/**
 * 💾 Salva um novo snippet pessoal direto na planilha e depois re-sincroniza
 */
export async function salvarSnippetPessoal(trigger: string, content: string, email: string) {
  try {
    const urlSalvar = `${APPS_SCRIPT_URL}?action=SAVE_PERSONAL&email=${encodeURIComponent(email.trim())}&trigger=${encodeURIComponent(trigger.trim())}&content=${encodeURIComponent(content)}`;
    
    const response = await fetch(urlSalvar);
    if (!response.ok) throw new Error("Failed to contact server");
    
    const resultado = await response.json();
    if (resultado.sucesso) {
      await sincronizarDadosPlanilha(email);
      return { sucesso: true };
    }
    return { sucesso: false, erro: resultado.erro || "Unknown server error." };
  } catch (e: any) {
    console.error("[OmniSnap Save Personal Error]", e);
    return { sucesso: false, erro: e.message || e };
  }
}

/**
 * 👥 Compartilha um snippet pessoal para que ele apareça na aba do Time (Shared)
 */
export async function compartilharSnippetComTime(trigger: string, content: string, email: string) {
  try {
    const urlCompartilhar = `${APPS_SCRIPT_URL}?action=SHARE_WITH_TEAM&email=${encodeURIComponent(email.trim())}&trigger=${encodeURIComponent(trigger.trim())}&content=${encodeURIComponent(content)}`;
    
    const response = await fetch(urlCompartilhar);
    if (!response.ok) throw new Error("Failed to contact server");
    
    const resultado = await response.json();
    if (resultado.sucesso) {
      await sincronizarDadosPlanilha(email);
      return { sucesso: true };
    }
    return { sucesso: false, erro: resultado.erro || "Unknown server error." };
  } catch (e: any) {
    console.error("[OmniSnap Share Error]", e);
    return { sucesso: false, erro: e.message || e };
  }
}

/**
 * 🗑️ Remove o snippet pessoal direto do Google Sheets com Logs de Debug
 */
export async function deletarSnippetPessoalDoSheets(trigger: string, email: string) {
  if (!email || !email.includes("@")) {
    console.error("[OmniSnap Cloud Delete] E-mail inválido abortado:", email);
    return { sucesso: false };
  }
  
  try {
    const urlDeletar = `${APPS_SCRIPT_URL}?action=DELETE_PERSONAL&email=${encodeURIComponent(email.trim())}&trigger=${encodeURIComponent(trigger.trim())}`;
    
    console.log("[OmniSnap Cloud Delete] Disparando requisição para URL:", urlDeletar);
    
    const response = await fetch(urlDeletar);
    if (!response.ok) throw new Error(`HTTP status ${response.status}`);
    
    const resultado = await response.json();
    console.log("[OmniSnap Cloud Delete] Resposta crua do Google Apps Script:", resultado);
    
    if (resultado.erro) {
      console.warn("[OmniSnap Cloud Delete] O Google retornou um erro interno:", resultado.erro);
    }
    
    return { sucesso: !!resultado.sucesso };
  } catch (e) {
    console.error("[OmniSnap Cloud Delete] Erro crítico na requisição fetch:", e);
    return { sucesso: false };
  }
}