// import { defineConfig } from 'wxt';

// // See https://wxt.dev/api/config.html
// export default defineConfig({
//   modules: ['@wxt-dev/module-react'],
// });


// import { defineConfig } from 'wxt';

// export default defineConfig({
//   modules: ['@wxt-dev/module-react'],
//   manifest: {
//     permissions: ['storage', 'tabs', 'clipboardWrite'],
//     // Adicione este bloco abaixo:
//     content_security_policy: {
//       extension_pages: "script-src 'self' 'wasm-unsafe-eval' http://localhost:3000; object-src 'self'"
//     }
//   },
// });

// wxt.config.ts
// wxt.config.ts





// wxt.config.ts
import { defineConfig } from 'wxt';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // O bloco vite fica na raiz da configuração
  vite: () => ({
    plugins: [react()],
  }),

  // Informações do manifesto ficam agrupadas aqui dentro
  manifest: {
    name: 'OmniSnap - DEV',
    version: '1.0.1',
    description: 'Sua extensão moderna de produtividade OmniSnap',
    permissions: ['storage', 'activeTab', 'clipboardWrite'],

    // ADICIONADO: Configuração nativa de comandos globais do navegador
    commands: {
      "abrir-busca-customizada": {
        suggested_key: {
          default: "Ctrl+Shift+F",
          mac: "MacCtrl+Shift+F"
        },
        description: "Abre a barra de busca moderna do OmniSnap"
      }
    }
  }
});


