const allowedTags = new Set([
  'A', 'B', 'BR', 'DIV', 'EM', 'FONT', 'I', 'P', 'SPAN', 'STRONG', 'SUB', 'SUP', 'U',
]);

const isSafeLink = (href: string): boolean =>
  /^(https?:|mailto:|tel:|\/|#)/i.test(href.trim());

const copySafeStyles = (source: HTMLElement, target: HTMLElement) => {
  const styles: Array<['color' | 'fontSize' | 'fontWeight' | 'fontStyle' | 'textDecoration' | 'lineHeight' | 'marginTop' | 'verticalAlign', RegExp]> = [
    ['color', /^[#(),.%\w\s-]+$/],
    ['fontSize', /^(inherit|\d+(?:\.\d+)?(?:px|pt|em|rem|%))$/i],
    ['fontWeight', /^(normal|bold|[1-9]00)$/i],
    ['fontStyle', /^(normal|italic|oblique)$/i],
    ['textDecoration', /^(none|underline|line-through|overline)$/i],
    ['lineHeight', /^(normal|\d+(?:\.\d+)?(?:px|em|rem|%)?)$/i],
    ['marginTop', /^-?\d+(?:\.\d+)?(?:px|pt|em|rem|%)$/i],
    ['verticalAlign', /^(baseline|super|sub)$/i],
  ];

  styles.forEach(([property, validValue]) => {
    const value = source.style[property];
    if (value && validValue.test(value)) {
      target.style[property] = value;
    }
  });
};

const appendSanitizedNode = (source: Node, target: Node) => {
  if (source.nodeType === Node.TEXT_NODE) {
    target.appendChild(document.createTextNode(source.textContent || ''));
    return;
  }
  if (!(source instanceof HTMLElement)) return;
  if (source.tagName === 'SCRIPT' || source.tagName === 'STYLE') return;

  if (!allowedTags.has(source.tagName)) {
    source.childNodes.forEach((child) => appendSanitizedNode(child, target));
    return;
  }

  const element = document.createElement(source.tagName === 'FONT' ? 'span' : source.tagName.toLowerCase());
  if (source.tagName === 'A') {
    const href = source.getAttribute('href') || '';
    if (isSafeLink(href)) {
      element.setAttribute('href', href);
      element.setAttribute('rel', 'noopener noreferrer');
    }
  }
  copySafeStyles(source, element);
  if (source.tagName === 'FONT') {
    const color = source.getAttribute('color') || '';
    if (/^#[0-9a-f]{3,8}$/i.test(color)) element.style.color = color;
  }
  source.childNodes.forEach((child) => appendSanitizedNode(child, element));
  target.appendChild(element);
};

export const sanitizeRichText = (html: string): string => {
  if (typeof DOMParser === 'undefined') {
    return escapeHtml(html.replace(/<[^>]*>/g, ''));
  }

  const parsed = new DOMParser().parseFromString(html, 'text/html');
  const container = document.createElement('div');
  parsed.body.childNodes.forEach((child) => appendSanitizedNode(child, container));
  return container.innerHTML;
};

export const escapeHtml = (text: string): string =>
  text.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character] || character);
