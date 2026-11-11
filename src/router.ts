import { clear } from './core/dom';
import { getSave } from './core/store';

export type Cleanup = void | (() => void);
export type Screen = (root: HTMLElement, params: string[]) => Cleanup;

const routes: [RegExp, Screen][] = [];
let cleanup: Cleanup;
let view: HTMLElement;

export function route(pattern: RegExp, screen: Screen): void {
  routes.push([pattern, screen]);
}

export function go(path: string): void {
  if (location.hash === `#${path}`) render();
  else location.hash = path;
}

function render(): void {
  if (typeof cleanup === 'function') cleanup();
  cleanup = undefined;
  clear(view);
  let path = location.hash.replace(/^#/, '') || '/';
  if (!getSave().profile && path !== '/start') path = '/start';
  if (path === '/') path = '/map';
  for (const [re, screen] of routes) {
    const m = path.match(re);
    if (m) {
      scrollTo(0, 0);
      cleanup = screen(view, m.slice(1));
      return;
    }
  }
  go('/map');
}

export function startRouter(el: HTMLElement): void {
  view = el;
  addEventListener('hashchange', render);
  render();
}
