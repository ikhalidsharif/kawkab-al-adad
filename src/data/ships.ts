/** Player vessel icons (simple SVGs, no people). viewBox 0 0 64 64, use currentColor. */
export const SHIPS: { id: string; name: string; svg: string }[] = [
  {
    id: 'rocket',
    name: 'الصاروخ',
    svg: '<path d="M32 4c9 8 13 20 11 34H21C19 24 23 12 32 4z" fill="currentColor" opacity=".9"/><circle cx="32" cy="24" r="5" fill="#050816"/><path d="M21 38l-8 10 10-2zM43 38l8 10-10-2z" fill="currentColor" opacity=".6"/><path d="M26 42h12l-2 10h-8z" fill="#fbbf24"/><path d="M29 52h6l-3 8z" fill="#fb7185"/>',
  },
  {
    id: 'saucer',
    name: 'الصحن الطائر',
    svg: '<ellipse cx="32" cy="36" rx="26" ry="9" fill="currentColor" opacity=".85"/><path d="M18 33c0-10 6-17 14-17s14 7 14 17z" fill="currentColor" opacity=".45"/><circle cx="20" cy="37" r="2.5" fill="#fbbf24"/><circle cx="32" cy="39" r="2.5" fill="#fbbf24"/><circle cx="44" cy="37" r="2.5" fill="#fbbf24"/><path d="M24 45l-4 10M40 45l4 10" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>',
  },
  {
    id: 'fighter',
    name: 'المقاتلة النجمية',
    svg: '<path d="M32 4l8 26 18 14-18 2-8 14-8-14-18-2 18-14z" fill="currentColor" opacity=".9"/><path d="M32 16l4 14h-8z" fill="#050816"/><circle cx="32" cy="40" r="4" fill="#fbbf24"/>',
  },
  {
    id: 'satellite',
    name: 'القمر الصناعي',
    svg: '<rect x="24" y="24" width="16" height="16" rx="3" fill="currentColor"/><rect x="2" y="27" width="18" height="10" fill="currentColor" opacity=".5"/><rect x="44" y="27" width="18" height="10" fill="currentColor" opacity=".5"/><path d="M20 32h4M40 32h4" stroke="currentColor" stroke-width="2"/><path d="M32 24V12" stroke="currentColor" stroke-width="2"/><circle cx="32" cy="10" r="3" fill="#fbbf24"/><circle cx="32" cy="32" r="3" fill="#050816"/>',
  },
  {
    id: 'shuttle',
    name: 'المكوك',
    svg: '<path d="M32 6c6 6 8 14 8 24v18H24V30c0-10 2-18 8-24z" fill="currentColor" opacity=".9"/><path d="M24 34L10 50h14zM40 34l14 16H40z" fill="currentColor" opacity=".55"/><rect x="28" y="18" width="8" height="6" rx="2" fill="#050816"/><path d="M26 48h12l-6 12z" fill="#fb7185"/>',
  },
  {
    id: 'robot',
    name: 'الروبوت المستكشف',
    svg: '<rect x="14" y="16" width="36" height="28" rx="8" fill="currentColor" opacity=".9"/><circle cx="25" cy="30" r="5" fill="#050816"/><circle cx="39" cy="30" r="5" fill="#050816"/><circle cx="25" cy="30" r="2" fill="#22d3ee"/><circle cx="39" cy="30" r="2" fill="#22d3ee"/><path d="M32 16V8" stroke="currentColor" stroke-width="3"/><circle cx="32" cy="6" r="3" fill="#fbbf24"/><rect x="20" y="46" width="24" height="10" rx="3" fill="currentColor" opacity=".5"/>',
  },
];

export const BOSS_SVG =
  '<path d="M32 6c14 0 26 9 26 20 0 7-5 12-12 15l4 13-10-8-8 10-8-10-10 8 4-13C11 38 6 33 6 26 6 15 18 6 32 6z" fill="currentColor"/><path d="M18 24l10 4-10 4zM46 24l-10 4 10 4z" fill="#050816"/><path d="M24 38h16" stroke="#050816" stroke-width="3"/>';

export function shipSvg(id: string, cls = 'w-10 h-10'): string {
  const s = SHIPS.find((x) => x.id === id) ?? SHIPS[0];
  return `<svg viewBox="0 0 64 64" class="${cls}" aria-hidden="true">${s.svg}</svg>`;
}
