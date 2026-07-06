// utils/salesforce.ts
import { SnippetType } from '@/entrypoints/options/OptionsApp';

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ─── Variáveis Salesforce ────────────────────────────────────────────────────

function getSalesforceVariable(v: 'customer' | 'account' | 'opportunity'): string {
  const map = {
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

  const searchIn = window.parent !== window ? window.parent.document : document;
  for (const sel of map[v]) {
    const el = searchIn.querySelector(sel);
    if (el?.textContent?.trim()) return el.textContent.trim();
  }
  return v.charAt(0).toUpperCase() + v.slice(1);
}

// ─── Cursor ──────────────────────────────────────────────────────────────────

function moveCursorToEnd(editor: HTMLElement): void {
  const doc = editor.ownerDocument;
  const win = doc.defaultView;
  if (!win) return;
  const range = doc.createRange();
  const sel = win.getSelection();
  if (!sel) return;
  const target = editor.lastChild || editor;
  range.selectNodeContents(target);
  range.collapse(false);
  sel.removeAllRanges();
  sel.addRange(range);
  editor.focus();
}

// ─── Estado global do monitor ────────────────────────────────────────────────

let currentEditor: HTMLElement | null = null;
let currentObserver: MutationObserver | null = null;
let replacing = false;

// ─── Localiza o editor ───────────────────────────────────────────────────────

function findEditor(): HTMLElement | null {
  if (
    document.body &&
    (document.body.classList.contains('cke_editable') ||
      document.body.getAttribute('role') === 'textbox' ||
      document.body.getAttribute('contenteditable') === 'true')
  ) {
    return document.body;
  }

  for (const sel of ['.ql-editor', '.slds-rich-text-area__content', '.cke_editable', 'div[contenteditable="true"]']) {
    const el = document.querySelector<HTMLElement>(sel);
    if (el) return el;
  }

  for (const iframe of Array.from(document.querySelectorAll<HTMLIFrameElement>('iframe'))) {
    try {
      const doc = iframe.contentDocument;
      if (!doc) continue;
      if (doc.body?.classList.contains('cke_editable')) return doc.body;
      for (const sel of ['.ql-editor', '.cke_editable', 'div[contenteditable="true"]']) {
        const el = doc.querySelector<HTMLElement>(sel);
        if (el) return el;
      }
    } catch { /* cross-origin */ }
  }

  return null;
}

// ─── Aplica snippets ─────────────────────────────────────────────────────────

function applySnippets(editor: HTMLElement): void {
  if (replacing) return;

  browser.storage.local.get('omnisnap_snippets').then((data) => {
    if (replacing) return; 

    const snippets = (data.omnisnap_snippets || []) as SnippetType[];
    if (snippets.length === 0) return;

    let htmlAtual = editor.innerHTML || '';
    // Limpa os caracteres invisíveis de largura zero (\u200B) que o Salesforce gera ao digitar
    const htmlNorm = htmlAtual.replace(/[\u200B-\u200D\uFEFF]/g, '');

    for (const item of snippets) {
      const gatilho = (item as any).gatilho ?? (item as any).trigger ?? (item as any).name;
      let conteudo = (item as any).conteudo ?? (item as any).content ?? '';

      if (!gatilho || !conteudo) continue;
      if (!htmlNorm.includes(gatilho) && !htmlAtual.includes(gatilho)) continue;

      console.log(`🔁 [OmniSnap] Gatilho detectado: "${gatilho}"`);

      // 1. Processa as variáveis dinâmicas de registro do Rackspace/Salesforce
      let textoFinal = String(conteudo)
        .replace(/#customer/g, getSalesforceVariable('customer'))
        .replace(/#account/g, getSalesforceVariable('account'))
        .replace(/#opportunity/g, getSalesforceVariable('opportunity'));

      // 🌟 CORREÇÃO 1: Preserva a estrutura original da macro limpando apenas 
      // ruídos de codificação que o Salesforce gera em loops paralelos de digitação
      textoFinal = textoFinal
        .replace(/\n/g, '<br clear="none">') // Converte as quebras de linha cruas para a tag padrão do CKEditor
        .replace(/color:\s*oklch[^;>]*;?/gi, '') // Remove travas de cores oklch soltas
        .replace(/background-color:\s*oklab[^;>]*;?/gi, ''); // Remove travas de fundos oklab soltos

      replacing = true;
      if (currentObserver) currentObserver.disconnect();

      try {
        editor.focus();
        
        // 🌟 CORREÇÃO 2: Substituição limpa e direta do HTML puro.
        // Removemos o span artificial externo para permitir que o CKEditor renderize 
        // as tags <b> e <a> da macro de forma nativa e alinhada com as margens da tela!
        const regex = new RegExp(escapeRegExp(gatilho), 'g');
        const novoHtml = htmlAtual.replace(regex, textoFinal);
        
        editor.innerHTML = novoHtml;

        // Comunica as mutações de volta ao framework do Salesforce para salvar o rascunho
        editor.dispatchEvent(new Event('input', { bubbles: true }));
        editor.dispatchEvent(new Event('change', { bubbles: true }));
        
        moveCursorToEnd(editor);
        console.log(`✅ [OmniSnap] Macro "${gatilho}" expandida nativamente na tela!`);
      } catch (err) {
        console.error('[OmniSnap] Falha ao processar substituição rica:', err);
      } finally {
        replacing = false;
        if (currentObserver && currentEditor) {
          currentObserver.observe(currentEditor, { childList: true, subtree: true, characterData: true });
        }
      }

      break; // Processa uma macro por ciclo
    }
  }).catch(() => {});
}

// ─── Anexa listeners ao editor ───────────────────────────────────────────────

function attachToEditor(editor: HTMLElement): void {
  if (currentObserver) {
    currentObserver.disconnect();
    currentObserver = null;
  }
  replacing = false;
  currentEditor = editor;

  console.log('✅ [OmniSnap] Anexado ao editor:', editor.tagName, editor.className.substring(0, 60));

  editor.addEventListener('input', () => {
    if (!replacing) applySnippets(editor);
  });

  editor.addEventListener('keyup', (e) => {
    if ((e as KeyboardEvent).key === ' ' || (e as KeyboardEvent).key === 'Enter') {
      if (!replacing) applySnippets(editor);
    }
  });

  currentObserver = new MutationObserver(() => {
    if (!replacing) applySnippets(editor);
  });
  currentObserver.observe(editor, { childList: true, subtree: true, characterData: true });

  setTimeout(() => applySnippets(editor), 300);
  setTimeout(() => applySnippets(editor), 1200);
}

// ─── Monitor principal ───────────────────────────────────────────────────────

export function replaceSnippetsInSalesforceIframe(): void {
  try {
    const editor = findEditor();
    if (!editor) return;

    if (editor === currentEditor) return;

    attachToEditor(editor);
  } catch (err) {
    console.error('[OmniSnap Engine Error]', err);
  }
}

export function iniciarMonitorSalesforce(): void {
  if (
    !window.location.hostname.includes('force.com') &&
    !window.location.hostname.includes('salesforce.com')
  ) {
    return;
  }

  replaceSnippetsInSalesforceIframe();
  setInterval(replaceSnippetsInSalesforceIframe, 1500);
}