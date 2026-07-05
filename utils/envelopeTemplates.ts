// utils/envelopeTemplates.ts

interface EnvelopeTemplate {
  name: string;
  subject: string;
  message: string;
  category: string;
}

// Lista estática das categorias baseada nas opções reais do DocuSign fornecidas por você
const CATEGORIAS_DOCUSIGN = [
  { value: "", label: "-- Select --" },
  { value: "AgencyAgreements", label: "Agency Agreements" },
  { value: "BankAccountOpeningAgreements", label: "Bank Account Opening Agreements" },
  { value: "ConfidentialityAgreements", label: "Confidentiality Agreements" },
  { value: "ConsultingAgreements", label: "Consulting Agreements" },
  { value: "ContractorAgreements", label: "Contractor Agreements" },
  { value: "CreditCardAgreements", label: "Credit Card Agreements" },
  { value: "DistributionAgreements", label: "Distribution Agreements" },
  { value: "EmploymentContracts", label: "Employment Contracts" },
  { value: "FranchiseAgreements", label: "Franchise Agreements" },
  { value: "IndependentContractorAgreements", label: "Independent Contractor Agreements" },
  { value: "IntellectualPropertyAssignmentAgreements", label: "Intellectual Property Assignment Agreements" },
  { value: "InvestmentAccountAgreements", label: "Investment Account Agreements" },
  { value: "JointVentureAgreements", label: "Joint Venture Agreements" },
  { value: "LeaseAgreements", label: "Lease Agreements" },
  { value: "LicensingAgreements", label: "Licensing Agreements" },
  { value: "LoanAgreements", label: "Loan Agreements" },
  { value: "LoanApplications", label: "Loan Applications" },
  { value: "NonDisclosureAgreements", label: "Non-Disclosure Agreements (NDAs)" },
  { value: "OnboardingAgreements", label: "Onboarding Agreements" },
  { value: "Other", label: "Other" },
  { value: "PartnershipAgreements", label: "Partnership Agreements" },
  { value: "PurchaseAgreements", label: "Purchase Agreements" },
  { value: "SalesContracts", label: "Sales Contracts" },
  { value: "ServiceAgreements", label: "Service Agreements" },
  { value: "SoftwareLicenseAgreements", label: "Software License Agreements" },
  { value: "VendorAgreements", label: "Vendor Agreements" },
  { value: "WealthManagementAgreements", label: "Wealth Management Agreements" }
];

const atualizarListaDropdown = (dropdown: HTMLSelectElement, templates: EnvelopeTemplate[]) => {
  dropdown.innerHTML = `<option value="">-- Selecione o Macro --</option>` + 
    templates.map((t, idx) => `<option value="${idx}">${t.name}</option>`).join('');
};

function injetarEstilosModal() {
  if (document.getElementById('omnisnap-modal-styles')) return;
  const style = document.createElement('style');
  style.id = 'omnisnap-modal-styles';
  style.textContent = `
    .omnisnap-modal-backdrop {
      position: fixed !important; top: 0 !important; left: 0 !important; width: 100vw !important; height: 100vh !important;
      background: rgba(0,0,0,0.6) !important; z-index: 2147483647 !important; display: flex !important;
      align-items: center !important; justify-content: center !important; font-family: sans-serif !important;
    }
    .omnisnap-modal-content {
      background: #fff !important; padding: 20px !important; border-radius: 8px !important; width: 550px !important;
      max-height: 80vh !important; overflow-y: auto !important; box-shadow: 0 10px 25px rgba(0,0,0,0.3) !important;
      color: #333 !important;
    }
    .omnisnap-modal-header { display: flex !important; justify-content: space-between !important; align-items: center !important; margin-bottom: 15px !important; }
    .omnisnap-modal-header h3 { margin: 0 !important; font-size: 16px !important; font-weight: bold !important; color: #1e293b !important; }
    .omnisnap-tpl-item { border: 1px solid #e2e8f0 !important; padding: 12px !important; border-radius: 6px !important; margin-bottom: 12px !important; background: #f8fafc !important; }
    .omnisnap-input-group { margin-bottom: 10px !important; display: flex !important; flex-direction: column !important; }
    .omnisnap-input-group label { font-size: 11px !important; font-weight: bold !important; color: #64748b !important; text-transform: uppercase !important; margin-bottom: 4px !important; }
    .omnisnap-input-group input, .omnisnap-input-group textarea, .omnisnap-input-group select { padding: 8px !important; border: 1px solid #cbd5e1 !important; border-radius: 4px !important; font-size: 13px !important; background: #fff !important; color: #0f172a !important; outline: none !important; }
    .omnisnap-modal-actions { display: flex !important; justify-content: flex-end !important; gap: 8px !important; margin-top: 15px !important; border-top: 1px solid #e2e8f0 !important; padding-top: 15px !important; }
    .omnisnap-btn { padding: 6px 14px !important; border: none !important; border-radius: 4px !important; cursor: pointer !important; font-size: 12px !important; font-weight: bold !important; text-transform: uppercase !important; }
    .omnisnap-btn-save { background: #16a34a !important; color: white !important; }
    .omnisnap-btn-delete { background: #dc3545 !important; color: white !important; padding: 4px 8px !important; font-size: 11px !important; }
    .omnisnap-btn-close { background: #64748b !important; color: white !important; padding: 4px 8px !important; }
  `;
  document.head.appendChild(style);
}

export async function abrirModalGerenciador() {
  injetarEstilosModal();
  
  const storage = await browser.storage.local.get("omnisnap_env_templates");
  const listaTemplates = (storage.omnisnap_env_templates || []) as EnvelopeTemplate[];

  const backdrop = document.createElement('div');
  backdrop.className = 'omnisnap-modal-backdrop';
  backdrop.id = 'omnisnap-manage-modal';

  const content = document.createElement('div');
  content.className = 'omnisnap-modal-content';
  
  content.innerHTML = `
    <div class="omnisnap-modal-header">
      <h3>⚙️ Manage OmniSnap Macros</h3>
      <button class="omnisnap-btn omnisnap-btn-close" id="btn-fechar-modal">✕</button>
    </div>
    <div id="lista-edicao-templates"></div>
    <div class="omnisnap-modal-actions">
      <button class="omnisnap-btn omnisnap-btn-save" id="btn-salvar-tudo-modal">Save All Changes</button>
    </div>
  `;
  backdrop.appendChild(content);
  document.body.appendChild(backdrop);

  const containerLista = content.querySelector('#lista-edicao-templates') as HTMLDivElement;

  if (listaTemplates.length === 0) {
    containerLista.innerHTML = '<p style="color:#64748b; text-align:center; padding: 20px;">No saved macros found.</p>';
  } else {
    listaTemplates.forEach((tpl, idx) => {
      const item = document.createElement('div');
      item.className = 'omnisnap-tpl-item';
      item.dataset.index = idx.toString();
      
      // Gera as opções do select dinamicamente, marcando a atual como selected
      const opcoesSelectHtml = CATEGORIAS_DOCUSIGN.map(cat => 
        `<option value="${cat.value}" ${tpl.category === cat.value ? 'selected' : ''}>${cat.label}</option>`
      ).join('');

      item.innerHTML = `
        <div class="omnisnap-input-group">
          <label>Macro Name:</label>
          <input type="text" class="edit-tpl-name" value="${tpl.name || ''}">
        </div>
        <div class="omnisnap-input-group">
          <label>Subject:</label>
          <input type="text" class="edit-tpl-subject" value="${tpl.subject || ''}">
        </div>
        <div class="omnisnap-input-group">
          <label>Message (Body):</label>
          <textarea rows="4" class="edit-tpl-message">${tpl.message || ''}</textarea>
        </div>
        <div class="omnisnap-input-group">
          <label>Category:</label>
          <select class="edit-tpl-category">${opcoesSelectHtml}</select>
        </div>
        <div style="display:flex; justify-content:flex-end; margin-top: 8px;">
          <button class="omnisnap-btn omnisnap-btn-delete btn-excluir-individual" data-index="${idx}">Remove</button>
        </div>
      `;
      containerLista.appendChild(item);
    });
  }

  content.querySelector('#btn-fechar-modal')!.addEventListener('click', () => backdrop.remove());

  content.querySelectorAll('.btn-excluir-individual').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const target = e.target as HTMLButtonElement;
      const indexToRemove = parseInt(target.dataset.index!, 10);
      
      const storageAtual = await browser.storage.local.get("omnisnap_env_templates");
      const tpls = (storageAtual.omnisnap_env_templates || []) as EnvelopeTemplate[];
      tpls.splice(indexToRemove, 1);
      
      await browser.storage.local.set({ omnisnap_env_templates: tpls });
      backdrop.remove();
      abrirModalGerenciador();
    });
  });

  content.querySelector('#btn-salvar-tudo-modal')!.addEventListener('click', async () => {
    const itensDOM = content.querySelectorAll('.omnisnap-tpl-item');
    const novosTemplates: EnvelopeTemplate[] = [];

    itensDOM.forEach((itemDOM: any) => {
      novosTemplates.push({
        name: (itemDOM.querySelector('.edit-tpl-name') as HTMLInputElement).value.trim(),
        subject: (itemDOM.querySelector('.edit-tpl-subject') as HTMLInputElement).value.trim(),
        message: (itemDOM.querySelector('.edit-tpl-message') as HTMLTextAreaElement).value,
        category: (itemDOM.querySelector('.edit-tpl-category') as HTMLSelectElement).value
      });
    });

    await browser.storage.local.set({ omnisnap_env_templates: novosTemplates });
    alert("✓ Macros updated successfully!");
    backdrop.remove();
    
    const selectTpl = document.getElementById('omnisnap-select-tpl') as HTMLSelectElement;
    if (selectTpl) {
      atualizarListaDropdown(selectTpl, novosTemplates);
    }
  });
}

export async function inicializarEnvelopeTemplates() {
  const inputSubject = document.querySelector('input[data-qa="prepare-subject"]') as HTMLInputElement;
  const textareaMessage = document.querySelector('textarea[data-qa="prepare-message"]') as HTMLTextAreaElement;

  if (!inputSubject || !textareaMessage || document.getElementById('omnisnap-template-toolbar')) return;

  const toolbar = document.createElement('div');
  toolbar.id = 'omnisnap-template-toolbar';
  toolbar.style.cssText = `
    display: flex; gap: 8px; margin: 12px 0; padding: 8px 12px;
    background-color: #f8fafc; border: 1px dashed #6366f1; border-radius: 8px;
    font-family: system-ui, -apple-system, sans-serif; align-items: center; width: 100%;
  `;

  toolbar.innerHTML = `
    <span style="font-size: 11px; font-weight: bold; color: #4f46e5; text-transform: uppercase; white-space: nowrap;">OmniSnap Macros:</span>
    <button id="omnisnap-btn-salvar-tpl" type="button" style="background: #16a34a; color: white; border: none; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: bold; text-transform: uppercase;">💾 Save Current</button>
    <button id="omnisnap-btn-carregar-tpl" type="button" style="background: #4f46e5; color: white; border: none; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: bold; text-transform: uppercase;">📋 Load Macro</button>
    <button id="omnisnap-btn-gerenciar-tpl" type="button" style="background: #64748b; color: white; border: none; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: bold; text-transform: uppercase;">⚙️ Manage</button>
    <div id="omnisnap-tpl-select-container" style="display: none; align-items: center; gap: 6px;">
      <select id="omnisnap-select-tpl" style="padding: 3px 6px; font-size: 12px; border-radius: 4px; border: 1px solid #cbd5e1; background: white; max-width: 180px; color: #0f172a;"></select>
    </div>
  `;

  inputSubject.closest('.css-k008qs')?.parentNode?.appendChild(toolbar);

  const btnSalvar = toolbar.querySelector('#omnisnap-btn-salvar-tpl') as HTMLButtonElement;
  const btnCarregar = toolbar.querySelector('#omnisnap-btn-carregar-tpl') as HTMLButtonElement;
  const btnGerenciar = toolbar.querySelector('#omnisnap-btn-gerenciar-tpl') as HTMLButtonElement;
  const selectTplContainer = toolbar.querySelector('#omnisnap-tpl-select-container') as HTMLDivElement;
  const selectTpl = toolbar.querySelector('#omnisnap-select-tpl') as HTMLSelectElement;

  btnSalvar.addEventListener('click', async () => {
    const selectCategoryLive = document.querySelector('select[data-qa="label-input-envelopeTypes"]') as HTMLSelectElement;
    
    const currentSubject = inputSubject.value.trim();
    const currentMessage = textareaMessage.value.trim();
    const currentCategory = selectCategoryLive ? selectCategoryLive.value : "";

    if (!currentSubject) {
      alert("⚠️ Digite pelo menos o assunto para poder salvar um template!");
      return;
    }

    const nomeTemplate = prompt("Digite um nome exclusivo para este macro de e-mail (Ex: teste template xyz):");
    if (!nomeTemplate) return;

    const storage = await browser.storage.local.get("omnisnap_env_templates");
    const listaTemplates = (storage.omnisnap_env_templates || []) as EnvelopeTemplate[];

    listaTemplates.push({
      name: nomeTemplate,
      subject: currentSubject,
      message: currentMessage,
      category: currentCategory
    });

    await browser.storage.local.set({ omnisnap_env_templates: listaTemplates });
    alert(`✓ Macro "${nomeTemplate}" guardado localmente com sucesso!`);
    atualizarListaDropdown(selectTpl, listaTemplates);
  });

  btnCarregar.addEventListener('click', async () => {
    const storage = await browser.storage.local.get("omnisnap_env_templates");
    const listaTemplates = (storage.omnisnap_env_templates || []) as EnvelopeTemplate[];

    if (listaTemplates.length === 0) {
      alert("Nenhum macro guardado ainda. Monte um assunto/mensagem e clique em 'Save Current'!");
      return;
    }

    atualizarListaDropdown(selectTpl, listaTemplates);
    selectTplContainer.style.display = selectTplContainer.style.display === 'none' ? 'flex' : 'none';
  });

  btnGerenciar.addEventListener('click', () => {
    abrirModalGerenciador();
  });

  selectTpl.addEventListener('change', async () => {
    const idx = selectTpl.value;
    if (idx === "") return;

    const storage = await browser.storage.local.get("omnisnap_env_templates");
    const listaTemplates = (storage.omnisnap_env_templates || []) as EnvelopeTemplate[];
    const template: EnvelopeTemplate = listaTemplates[parseInt(idx, 10)];

    if (template) {
      inputSubject.value = template.subject || "";
      inputSubject.dispatchEvent(new Event('input', { bubbles: true }));

      textareaMessage.value = template.message || "";
      textareaMessage.dispatchEvent(new Event('input', { bubbles: true }));
      textareaMessage.dispatchEvent(new Event('change', { bubbles: true }));

      const selectCategoryLive = document.querySelector('select[data-qa="label-input-envelopeTypes"]') as HTMLSelectElement;
      if (selectCategoryLive && template.category) {
        selectCategoryLive.value = template.category;
        selectCategoryLive.dispatchEvent(new Event('change', { bubbles: true }));
      }

      selectTplContainer.style.display = 'none';
      selectTpl.value = "";
    }
  });
}