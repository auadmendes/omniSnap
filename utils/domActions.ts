// utils/domActions.ts

export function getPageLinks(): string {
  // Pega todos os elementos <a> da página
  const anchors = Array.from(document.querySelectorAll('a'));
  
  // Extrai apenas os links válidos que começam com http
  const links = anchors
    .map(a => a.href)
    .filter(href => href.startsWith('http'));

  // IMPORTANTE: Remove duplicados e junta tudo em uma string separada por quebra de linha
  const linksUnicos = [...new Set(links)];
  return linksUnicos.join('\n');
}

export const changeBackgroundColor = (color: string) => {
  document.body.style.backgroundColor = color;
};