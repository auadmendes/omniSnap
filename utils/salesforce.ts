// utils/salesforce.ts

import { SnippetType } from '@/entrypoints/options/OptionsApp';

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const editorSelectors = [
  '.ql-editor',                     // Quill Editor
  '.slds-rich-text-area__content',  // Salesforce RTE
  'iframe[title="Rich text editor"]',// CKEditor em iframe
  '.cke_wysiwyg_frame iframe',      // CKEditor dentro de iframe
  '.cke_wysiwyg_frame',             // CKEditor direto
];

/** Deep selector customizado que fura os componentes de Shadow DOM do Salesforce */
function deepQuerySelector(selector: string, root: Document | ShadowRoot = document): Element | null {
  const el = root.querySelector(selector);
  if (el) return el;

  for (const host of Array.from(root.querySelectorAll("*"))) {
    // @ts-ignore
    if (host.shadowRoot) {
      // @ts-ignore
      const found = deepQuerySelector(selector, host.shadowRoot);
      if (found) return found;
    }
  }
  return null;
}

/** Resgata as variáveis dinâmicas baseadas na tela atual */
function getSalesforceVariable(variable: "customer" | "account" | "opportunity") {
  const selectorsMap = {
    customer: [
      '.slds-page-header__title span[title]',
      '.windowViewMode-maximized.active a[href*="/lightning/r/Contact/"] span[title]',
      'a[href*="/lightning/r/Contact/"] span span span',
      'a[href*="/lightning/r/Contact/"] span',
      'a[href*="/lightning/r/Contact/"]',
      'records-record-layout-item a[href*="/lightning/r/Contact/"] span[title]',
      'records-record-layout-item a[href*="/lightning/r/Contact/"]',
    ],
    account: [
      'a[href*="/lightning/r/Account/"] span[title]',
      'a[href*="/lightning/r/Account/"] span span span',
      'a[href*="/lightning/r/Account/"] span',
      'a[href*="/lightning/r/Account/"]',
      '[data-field="AccountId"] a',
    ],
    opportunity: [
      'a[href*="/lightning/r/Opportunity/"] span[title]',
      'a[href*="/lightning/r/Opportunity/"] span span span',
      'a[href*="/lightning/r/Opportunity/"] span',
      'a[href*="/lightning/r/Opportunity/"]',
      '[data-field="OpportunityId"] a',
    ],
  };

  const selectors = selectorsMap[variable];
  for (const sel of selectors) {
    const el = deepQuerySelector(sel);
    if (el?.textContent?.trim()) {
      return el.textContent.trim();
    }
  }
  return variable.charAt(0).toUpperCase() + variable.slice(1);
}

function moveCursorToEnd(editor: HTMLElement) {
  const range = document.createRange();
  const selection = window.getSelection();
  if (!selection) return;

  if (editor.lastChild) {
    range.selectNodeContents(editor.lastChild);
    range.collapse(false);
  } else {
    range.selectNodeContents(editor);
    range.collapse(false);
  }
  selection.removeAllRanges();
  selection.addRange(range);
  editor.focus();
}

/**
 * ENGINE CENTRAL DE INTERCEPÇÃO
 * Mantém a exata assinatura por MutationObserver da sua extensão antiga
 */
function replaceSnippetsInSalesforceIframe() {
  let editor = document.querySelector<HTMLElement>(editorSelectors.join(", "));

  if (editor instanceof HTMLIFrameElement) {
    editor = editor.contentDocument?.querySelector("body") || null;
  }

  if (!editor) return;

  // Evita reanexar o observer caso o loop passe pelo mesmo elemento
  if (editor.dataset.omnisnapObserved === "true") return;

  console.log("✅ [OmniSnap Core] Editor localizado com sucesso no Salesforce:", editor);

  function applySnippets() {
    if (!editor) return;

    // Conecta com o novo banco de dados do OmniSnap Core
    browser.storage.local.get("omnisnap_snippets").then((data) => {
      const snippetsArray = (data.omnisnap_snippets || []) as SnippetType[];
      
      let updatedContent = editor!.innerHTML;
      let mudou = false;

      for (const item of snippetsArray) {
        if (updatedContent.includes(item.gatilho)) {
          // Processa tokens dinâmicos (#customer) resgatando do Shadow DOM principal
          let textoSnippet = item.conteudo
            .replace(/#customer/g, getSalesforceVariable("customer"))
            .replace(/#account/g, getSalesforceVariable("account"))
            .replace(/#opportunity/g, getSalesforceVariable("opportunity"));

          const regex = new RegExp(escapeRegExp(item.gatilho), "g");
          updatedContent = updatedContent.replace(regex, textoSnippet);
          mudou = true;
        }
      }

      if (mudou && editor!.innerHTML !== updatedContent) {
        console.log(`✏️ [OmniSnap Core] Substituindo snippet ricos:`, editor!.innerHTML, "→", updatedContent);
        editor!.innerHTML = updatedContent;
        editor!.dispatchEvent(new Event("input", { bubbles: true }));
        moveCursorToEnd(editor!);
      }
    }).catch(console.error);
  }

  const observer = new MutationObserver(() => applySnippets());
  observer.observe(editor, { childList: true, subtree: true, characterData: true });
  
  editor.dataset.omnisnapObserved = "true";
}

/**
 * ATIVADOR CONTÍNUO
 * Roda de forma recorrente para pegar as trocas de abas da SPA
 */
export function iniciarMonitorSalesforce() {
  if (!window.location.hostname.includes("force.com") && !window.location.hostname.includes("salesforce.com")) {
    return;
  }

  // Executa continuamente a cada 1.5 segundos para re-pescar novas janelas abertas
  setInterval(() => {
    replaceSnippetsInSalesforceIframe();
  }, 1500);
}