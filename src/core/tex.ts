import katex from 'katex';

const cache = new Map<string, string>();

export function texHtml(tex: string, display = false): string {
  const key = (display ? 'D' : 'I') + tex;
  let html = cache.get(key);
  if (html === undefined) {
    html = katex.renderToString(tex, { throwOnError: false, displayMode: display, strict: false });
    cache.set(key, html);
  }
  return html;
}

/** Render a single TeX expression into an LTR span. */
export function mathEl(tex: string, display = false): HTMLElement {
  const span = document.createElement('span');
  span.dir = 'ltr';
  span.className = display ? 'math math-display' : 'math';
  span.innerHTML = texHtml(tex, display);
  return span;
}

/** Plain text with **bold** segments. */
function appendText(el: HTMLElement, text: string): void {
  text.split(/\*\*(.+?)\*\*/g).forEach((part, i) => {
    if (!part) return;
    if (i % 2) {
      const b = document.createElement('b');
      b.className = 'text-neon';
      b.textContent = part;
      el.append(b);
    } else el.append(document.createTextNode(part));
  });
}

/** Render Rich text: Arabic prose with **bold**, $inline$ and $$display$$ TeX segments. */
export function rich(text: string, cls = ''): HTMLElement {
  const el = document.createElement('span');
  if (cls) el.className = cls;
  const re = /\$\$([^$]+)\$\$|\$([^$]+)\$/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) appendText(el, text.slice(last, m.index));
    el.append(m[1] !== undefined ? mathEl(m[1], true) : mathEl(m[2]));
    last = re.lastIndex;
  }
  if (last < text.length) appendText(el, text.slice(last));
  return el;
}
