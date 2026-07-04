// utils/sidebarDrawer.ts

export function inicializarSidebarExpansivel() {
  if (document.getElementById('omnisnap-sidebar-container')) return;

  const container = document.createElement('div');
  container.id = 'omnisnap-sidebar-container';

  const estilo = document.createElement('style');
  estilo.textContent = `
    #omnisnap-sidebar-container {
      position: fixed;
      top: 15%;
      right: 0;
      z-index: 2147483647;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      display: flex;
      align-items: flex-start;
      pointer-events: none;
    }
    .omnisnap-aba-gatilho {
      pointer-events: auto;
      background: #0056b3;
      color: #ffffff;
      padding: 12px 6px;
      border-radius: 8px 0 0 8px;
      cursor: pointer;
      box-shadow: -2px 2px 8px rgba(0,0,0,0.2);
      writing-mode: vertical-rl;
      text-orientation: mixed;
      font-size: 11px;
      font-weight: bold;
      letter-spacing: 1px;
      transition: all 0.2s ease;
      border: 1px solid rgba(255,255,255,0.2);
      border-right: none;
    }
    .omnisnap-aba-gatilho:hover {
      background: #004085;
      padding-left: 10px;
    }
    .omnisnap-painel-conteudo {
      pointer-events: auto;
      width: 0;
      height: 520px;
      background: #ffffff;
      box-shadow: -4px 4px 15px rgba(0,0,0,0.15);
      border-left: 1px solid #e2e8f0;
      border-radius: 0 0 0 12px;
      overflow: hidden;
      transition: width 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      display: flex;
      flex-direction: column;
    }
    #omnisnap-sidebar-container.aberto .omnisnap-painel-conteudo {
      width: 350px;
    }
    .omnisnap-header {
      background: #f8fafc;
      padding: 12px 16px;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .omnisnap-header h3 {
      margin: 0;
      font-size: 14px;
      color: #1e293b;
    }
    .omnisnap-btn-fechar {
      background: none;
      border: none;
      font-size: 18px;
      cursor: pointer;
      color: #64748b;
      line-height: 1;
    }
    .omnisnap-corpo {
      padding: 16px;
      flex: 1;
      overflow-y: auto;
      font-size: 13px;
      color: #334155;
    }
    .omnisnap-info-box {
      background: #f1f5f9;
      border-left: 3px solid #0056b3;
      padding: 8px 12px;
      margin-bottom: 12px;
      border-radius: 0 4px 4px 0;
    }
    .omnisnap-label {
      font-weight: 600;
      font-size: 11px;
      color: #64748b;
      text-transform: uppercase;
    }
    .omnisnap-valor {
      margin-top: 2px;
      word-break: break-all;
      color: #0f172a;
    }
  `;

  container.innerHTML = `
    <div class="omnisnap-aba-gatilho">📄 OMNISNAP</div>
    <div class="omnisnap-painel-conteudo">
      <div class="omnisnap-header">
        <h3>OmniSnap - Coleta de Dados</h3>
        <button class="omnisnap-btn-fechar">&times;</button>
      </div>
      <div class="omnisnap-corpo">
        <div id="omnisnap-dados-dinamicos">
          <p style="color: #94a3b8; text-align: center; margin-top: 20px;">Carregando...</p>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(estilo);
  document.body.appendChild(container);

  const abaGatilho = container.querySelector('.omnisnap-aba-gatilho') as HTMLElement;
  const btnFechar = container.querySelector('.omnisnap-btn-fechar') as HTMLElement;

  const alternarPainel = () => {
    container.classList.toggle('aberto');
    if (container.classList.contains('aberto')) {
      coletarDadosDaPaginaDocuSign();
    }
  };

  abaGatilho.addEventListener('click', alternarPainel);
  btnFechar.addEventListener('click', () => container.classList.remove('aberto'));
}

function coletarDadosDaPaginaDocuSign() {
  const containerDados = document.getElementById('omnisnap-dados-dinamicos');
  if (!containerDados) return;

  try {
    // ----------------------------------------------------
    // 🕵️‍♂️ MAPEAMENTO DA TABELA "ENVELOPE" (HTML Dinâmico)
    // ----------------------------------------------------
    const tabelaEnvelope = document.getElementById("Envelope") as HTMLTableElement;
    
    let envelopeType = "N/A";
    let integratorKey = "N/A";
    let isEnvelopeIdStampingEnabled = "N/A";
    let templateDescription = "N/A";

    if (tabelaEnvelope) {
      const cabecalhos = Array.from(tabelaEnvelope.rows[0].cells).map(cell => cell.textContent?.trim());
      const valores = Array.from(tabelaEnvelope.rows[1].cells).map(cell => cell.textContent?.trim());

      // Função auxiliar para mapear coluna por nome exato
      const buscarValorPorColuna = (nomeColuna: string) => {
        const index = cabecalhos.indexOf(nomeColuna);
        return index !== -1 && valores[index] ? valores[index] : "N/A";
      };

      envelopeType = buscarValorPorColuna("EnvelopeType");
      integratorKey = buscarValorPorColuna("IntegratorKey");
      isEnvelopeIdStampingEnabled = buscarValorPorColuna("IsEnvelopeIDStampingEnabled");
      templateDescription = buscarValorPorColuna("TemplateDescription");
    }

    // ----------------------------------------------------
    // 🕵️‍♂️ MAPEAMENTO DA SEÇÃO DE TEXTO "SETTINGS" (Configurações Internas)
    // ----------------------------------------------------
    const containerSettings = document.querySelector("#Recipients pre");
    let textSettings = containerSettings ? containerSettings.textContent || "" : "";

    // Funções auxiliares baseadas em Regex para capturar propriedades dentro da tag <pre> ou texto cru
    const extrairDeSettings = (chave: string): string => {
      const regex = new RegExp(`${chave}\\s*=\\s*([^\\n\\r]+)`, "i");
      const match = textSettings.match(regex);
      return match ? match[1].trim() : "N/A";
    };

    // 1. Document Visibility (Se houver chave correspondente ou similar como "DocumentVisibility" no array)
    let documentVisibility = extrairDeSettings("DocumentVisibility");
    if (documentVisibility === "N/A") {
      // Verificação secundária caso mude o padrão de nomenclatura interna da API
      documentVisibility = textSettings.toLowerCase().includes("visibility") ? "Ativo/Presente" : "Inativo/Não listado";
    }

    // 2. Expiration / Timeout (Mapeado no DocuSign DB pelo TimeoutAfter ou ExpireAfter da tabela Envelope)
    let expirationDate = "N/A";
    if (tabelaEnvelope) {
      const idxTimeout = Array.from(tabelaEnvelope.rows[0].cells).map(c => c.textContent?.trim()).indexOf("TimeoutAfter");
      if (idxTimeout !== -1 && tabelaEnvelope.rows[1].cells[idxTimeout]) {
        expirationDate = tabelaEnvelope.rows[1].cells[idxTimeout].textContent?.trim() || "N/A";
      }
    }

    // 3. Template - Verifica se foi gerado via Powerform ou Template ID nativo
    let templateIdInfo = "N/A";
    const celulaEstId = document.querySelector(".estID");
    if (celulaEstId) {
      templateIdInfo = celulaEstId.textContent?.replace("5", "").trim() || "N/A"; // Captura o texto "Sent from a Powerform"
    } else {
      templateIdInfo = templateDescription !== "N/A" ? templateDescription : "N/A";
    }

    // 4. Template Applied to Document
    let templateApplied = "N/A";
    const regexTemplateApplied = /TemplateApplied\s*=\s*([^\n\r]+)/i;
    const matchApplied = textSettings.match(regexTemplateApplied);
    templateApplied = matchApplied ? matchApplied[1].trim() : (templateIdInfo !== "N/A" ? "Aplicado via " + templateIdInfo : "Não Detectado");

    // ----------------------------------------------------
    // 🌟 RENDERIZAÇÃO DA SIDEBAR EXPANDIDA
    // ----------------------------------------------------
    containerDados.innerHTML = `
      <div class="omnisnap-info-box">
        <div class="omnisnap-label">Envelope Type</div>
        <div class="omnisnap-valor"><b>${envelopeType}</b></div>
      </div>
      
      <div class="omnisnap-info-box">
        <div class="omnisnap-label">Integrator Key (Nº)</div>
        <div class="omnisnap-valor"><code>${integratorKey}</code></div>
      </div>

      <div class="omnisnap-info-box">
        <div class="omnisnap-label">Document Visibility</div>
        <div class="omnisnap-valor">${documentVisibility}</div>
      </div>

      <div class="omnisnap-info-box">
        <div class="omnisnap-label">Expiration Date (Timeout)</div>
        <div class="omnisnap-valor">${expirationDate}</div>
      </div>

      <div class="omnisnap-info-box">
        <div class="omnisnap-label">IsEnvelopeIDStampingEnabled</div>
        <div class="omnisnap-valor" style="font-weight: bold; color: ${isEnvelopeIdStampingEnabled.toLowerCase() === 'true' ? '#15803d' : '#b91c1c'}">
          ${isEnvelopeIdStampingEnabled}
        </div>
      </div>

      <div class="omnisnap-info-box">
        <div class="omnisnap-label">Template (Nome/ID)</div>
        <div class="omnisnap-valor">${templateIdInfo}</div>
      </div>

      <div class="omnisnap-info-box">
        <div class="omnisnap-label">Template Applied to Document</div>
        <div class="omnisnap-valor">${templateApplied}</div>
      </div>
    `;
  } catch (error) {
    console.error("Erro na raspagem do OmniSnap:", error);
    containerDados.innerHTML = `<p style="color: #b91c1c; font-weight: bold;">Erro ao processar as tabelas de relatório desta página.</p>`;
  }
}