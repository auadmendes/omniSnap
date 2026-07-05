// utils/tabfinder.ts

export function inicializarTabFinder() {
  // Evita duplicar o painel na tela se o usuário apertar o atalho várias vezes
  let painelExistente = document.getElementById('omnisnap-tabfinder-panel');
  if (painelExistente) {
    painelExistente.style.display = painelExistente.style.display === 'none' ? 'block' : 'none';
    const input = painelExistente.querySelector('input');
    if (input) input.focus();
    return;
  }

  // 1. Criar o container do Buscador de Abas
  const painel = document.createElement('div');
  painel.id = 'omnisnap-tabfinder-panel';
  
  // Estilização limpa e moderna (fundo escuro para contrastar bem)
  painel.style.cssText = `
    position: fixed !important;
    top: 20px !important;
    left: 50% !important;
    transform: translateX(-50%) !important;
    width: 450px !important;
    background-color: #1e1e2e !important;
    border: 1px solid #3b3b4f !important;
    border-radius: 12px !important;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.4) !important;
    padding: 14px !important;
    z-index: 2147483647 !important;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
    color: #cdd6f4 !important;
  `;

  // Layout HTML interno do Buscador
  painel.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
      <span style="font-size: 12px; font-weight: bold; color: #cba6f7; letter-spacing: 0.5px;">🔍 OMNISNAP - SEARCH MULTI TABS</span>
      <button id='omnisnap-tabfinder-close' style="background: none; border: none; color: #a6adc8; font-size: 16px; cursor: pointer;">&times;</button>
    </div>
    <div style="display: flex; gap: 8px; align-items: center;">
      <input type="text" id="omnisnap-tabfinder-input" placeholder="Digite o termo para buscar em todas as abas..." 
        style="flex: 1; background-color: #11111b; border: 1px solid #45475a; border-radius: 6px; padding: 8px 12px; color: #cdd6f4; font-size: 13px; outline: none;" />
      <button id="omnisnap-tabfinder-btn" style="background-color: #89b4fa; color: #11111b; border: none; padding: 8px 16px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 13px;">Buscar</button>
    </div>
    <div id="omnisnap-tabfinder-results" style="margin-top: 10px; max-height: 200px; overflow-y: auto; font-size: 12px; display: none; padding-right: 4px;"></div>
  `;

  document.body.appendChild(painel);

  // Mapear elementos do DOM interno
  const inputBusca = painel.querySelector('#omnisnap-tabfinder-input') as HTMLInputElement;
  const btnBuscar = painel.querySelector('#omnisnap-tabfinder-btn') as HTMLButtonElement;
  const divResultados = painel.querySelector('#omnisnap-tabfinder-results') as HTMLDivElement;
  const btnFechar = painel.querySelector('#omnisnap-tabfinder-close') as HTMLButtonElement;

  // Foca automaticamente no input ao abrir
  inputBusca.focus();

  // Função que executa a busca mandando mensagem para o background.ts
const executarBusca = () => {
    const termo = inputBusca.value.trim();
    if (!termo) {
      divResultados.style.display = 'block';
      divResultados.innerHTML = `<div style="color: #f38ba8; text-align: center; padding: 5px;">Digite um termo!</div>`;
      return;
    }

    divResultados.style.display = 'block';
    divResultados.innerHTML = `<div style="color: #a6adc8; text-align: center; padding: 10px;">Pesquisando nas abas...</div>`;

    // Dispara a mensagem para o Service Worker (background.ts)
    browser.runtime.sendMessage({ action: "SEARCH_ALL_TABS", termo })
      .then((response) => {
        const abas = response?.dados || [];
        
        if (abas.length === 0) {
          divResultados.innerHTML = `<div style="color: #f38ba8; text-align: center; padding: 10px; font-size: 13px;">Nenhum resultado encontrado nas outras abas.</div>`;
          return;
        }

        // Renderiza cada aba encontrada como um item clicável com estilo hover escuro
        divResultados.innerHTML = abas.map((aba: any) => `
          <div class="omnisnap-tab-link" data-id="${aba.id}" 
            style="padding: 8px; margin-bottom: 4px; background-color: #181825; border-radius: 6px; cursor: pointer; border: 1px solid #313244; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #89b4fa; text-decoration: underline;"
            title="${aba.title}">
            📌 ${aba.title}
          </div>
        `).join('');

        // Aplica o evento de clique para focar na aba instantaneamente ao clicar nela
        divResultados.querySelectorAll('.omnisnap-tab-link').forEach(item => {
          item.addEventListener('click', (e) => {
            const idDaAba = parseInt((e.currentTarget as HTMLElement).getAttribute('data-id') || "0", 10);
            if (idDaAba) {
              browser.runtime.sendMessage({ action: "FOCUS_TAB", tabId: idDaAba }); // Garante o foco via background caso o content script bloqueie
              painel.style.display = 'none'; // Esconde a barra de busca
            }
          });
        });
      })
      .catch((err) => {
        console.error("Erro ao enviar mensagem de busca:", err);
        divResultados.innerHTML = `<div style="color: #f38ba8; text-align: center; padding: 10px;">Erro na comunicação com a extensão.</div>`;
      });
  };

  // Listeners de gatilho (Botão, Enter e Fechar)
  btnBuscar.addEventListener('click', executarBusca);
  inputBusca.addEventListener('keydown', (e) => { if (e.key === 'Enter') executarBusca(); });
  btnFechar.addEventListener('click', () => { painel.style.display = 'none'; });
}