// postcss.config.js
export default {
  plugins: {
    // CORREÇÃO: Mudamos de 'tailwindcss' para o plug-in da v4
    '@tailwindcss/postcss': {}, 
    autoprefixer: {},
  },
}