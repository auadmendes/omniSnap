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

  // CORREÇÃO: Informações do manifesto ficam agrupadas aqui dentro
  manifest: {
    name: 'OmniSnap',
    version: '1.0.0',
    description: 'Sua extensão moderna de produtividade OmniSnap',
    permissions: ['storage', 'activeTab', 'clipboardWrite'],
  }
});


