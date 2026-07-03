// utils/snippetHandler.ts

import { SnippetType } from '@/entrypoints/options/OptionsApp';

/** Auxiliar para varrer elementos profundos dentro do Shadow DOM (Salesforce) */
function deepQuerySelector(selector: string, root: Document | ShadowRoot = document): Element | null {
  const el = root.querySelector(selector);
  if (el) return el;
  for (const host of Array.from(root.querySelectorAll("*"))) {
    if (host.shadowRoot) {
      const found = deepQuerySelector(selector, host.shadowRoot);
      if (found) return found;
    }
  }
  return null;
}

/** Resgata dinamicamente o valor das variáveis do Salesforce baseadas no registro atual */
function obterVariavelSalesforce(tipo: "customer" | "account" | "opportunity"): string {
  const selectorsMap = {
    customer: [
      '.slds-page-header__title span[title]',
      '.windowViewMode-maximized.active a[href*="/lightning/r/Contact/"] span[title]',
      'a[href*="/lightning/r/Contact/"] span span span',
      'a[href*="/lightning/r/Contact/"] span',
    ],
    account: [
      'a[href*="/lightning/r/Account/"] span[title]',
      'a[href*="/lightning/r/Account/"] span span span',
      '[data-field="AccountId"] a',
    ],
    opportunity: [
      'a[href*="/lightning/r/Opportunity/"] span[title]',
      '[data-field="OpportunityId"] a',
    ],
  };

  const selectors = selectorsMap[tipo];
  for (const sel of selectors) {
    const el = deepQuerySelector(sel);
    if (el?.textContent?.trim()) {
      return el.textContent.trim();
    }
  }
  return tipo.charAt(0).toUpperCase() + tipo.slice(1);
}

/** Injeta as variáveis do Salesforce dentro do corpo do texto do Snippet */
function processarTokensDinamicos(texto: string): string {
  return texto
    .replace(/#customer/g, obterVariavelSalesforce("customer"))
    .replace(/#account/g, obterVariavelSalesforce("account"))
    .replace(/#opportunity/g, obterVariavelSalesforce("opportunity"));
}

/** Move o cursor de digitação para o final após a injeção do HTML (Gmail / Salesforce) */
function ajustarPosicaoCursor(editor: HTMLElement) {
  const range = document.createRange();
  const selection = window.getSelection();
  if (!selection) return;

  range.selectNodeContents(editor);
  range.collapse(false); // Colapsa o ponteiro para o final absoluto do bloco
  selection.removeAllRanges();
  selection.addRange(range);
  editor.focus();
}

/** Helper para extrair o texto de forma limpa, lidando com quebras do Gmail */
function obterTextoDoEditor(elemento: HTMLElement): string {
  // Substitui entidades comuns do Gmail como espaços inquebráveis por espaços normais
  return elemento.innerText.replace(/\u00a0/g, " ");
}

/**
 * CORE INTERCEPTOR: Escuta os gatilhos no keyup/input e injeta 
 * os dados de forma compatível com formulários comuns, Salesforce e Gmail
 */
export async function handleSnippets(event: Event) {
  let target = event.target as HTMLInputElement | HTMLTextAreaElement | HTMLElement;
  if (!target) return;

  // AJUSTE GMAIL: Se o evento disparar em um nó interno do Gmail, sobe até a div editável principal
  if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA' && !target.isContentEditable) {
    const editorGmail = target.closest('div[role="textbox"][contenteditable="true"]');
    if (editorGmail) {
      target = editorGmail as HTMLElement;
    } else {
      return;
    }
  }

  const isInput = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
  const isContentEditable = target.isContentEditable;

  // Busca os dados cadastrados na página de opções do OmniSnap
  const data = await browser.storage.local.get('omnisnap_snippets');
  const snippets = (data.omnisnap_snippets || []) as SnippetType[];
  if (snippets.length === 0) return;

  // Captura o texto de forma normalizada
  let valorCompleto = isInput 
    ? (target as HTMLInputElement | HTMLTextAreaElement).value 
    : obterTextoDoEditor(target as HTMLElement);

  // Percorre os gatilhos cadastrados
  for (const snippet of snippets) {
    if (valorCompleto.includes(snippet.gatilho)) {
      
      // Processa tokens automáticos (#customer)
      let conteudoExpandido = processarTokensDinamicos(snippet.conteudo);

      if (isInput) {
        const input = target as HTMLInputElement | HTMLTextAreaElement;
        const textoPuro = conteudoExpandido.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '');
        const novoValor = valorCompleto.replace(snippet.gatilho, textoPuro);
        
        input.value = novoValor;
        input.setSelectionRange(novoValor.length, novoValor.length);
        input.dispatchEvent(new Event('input', { bubbles: true }));
      } 
      else if (isContentEditable) {
        const editorHtml = target as HTMLElement;
        
        // Garante que quebras de linha sejam interpretadas nativamente no Rich Text
        const htmlFormatado = conteudoExpandido.replace(/\n/g, "<br>");
        
        editorHtml.focus();
        
        // Método nativo estável para injetar HTML preservando a estrutura de nós do Gmail
        document.execCommand('insertHTML', false, htmlFormatado);
        
        // Limpa o gatilho textual residual que sobrou do nó do editor
        if (editorHtml.innerHTML.includes(snippet.gatilho)) {
          editorHtml.innerHTML = editorHtml.innerHTML.replace(snippet.gatilho, "");
        }

        // Dispara os eventos exigidos pelo ecossistema do Google Workspace/Gmail
        editorHtml.dispatchEvent(new Event('input', { bubbles: true }));
        editorHtml.dispatchEvent(new Event('change', { bubbles: true }));
        
        ajustarPosicaoCursor(editorHtml);
      }
      
      console.log(`[OmniSnap] Expansão executada com sucesso para: ${snippet.gatilho}`);
      break;
    }
  }
}