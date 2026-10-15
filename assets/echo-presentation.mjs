/** Viewer labels, navigation and short summaries. No DOM, storage or network. */
export const privacyCopy = 'Your ratings are stored under your private review link. Anyone with the link can see and change them, so share it only with people you trust. Our team can see them too, to build your next version. They are never published.';

// The front operator from B.A.'s /assets/favicon.svg, unchanged.
export const operatorPath = 'M27 25c-8-16 16-24 22-11 7 4 5 10 1 12v9L38 44 27 35Z';
export function operatorLayers(value) {
  return Array.from({length:value}, (_, index) => {
    const depth = value - index - 1;
    return {depth, transform:`translate(${depth * 7 - 24} -6)`, opacity:depth ? .55 - depth * .09 : 1};
  });
}

export function roleLabel(type = 'part') {
  const names = {hero:'hero', cta:'button', pwa:'offline review', canonical:'consulting disclosure',
    'share-card':'share card', positioning:'what we do', component:'part', headline:'heading',
    nav:'navigation', 'list-item':'list item'};
  return names[type] || type.replaceAll('-', ' ').replaceAll('_', ' ');
}
export function componentLabel(component, inventory = []) {
  const known = inventory.find(c => c.cid === component.cid);
  if (known?.label) return known.label;
  if (component.label) return component.label;
  const page = String(component.page || component.cid?.split('.')[0] || '');
  const language = component.cid?.includes('.ES.') ? ' (Spanish)' : '';
  return `${/^[1-7]$/.test(page) ? `Design ${page}${language}` : 'Your review'} ${roleLabel(component.type)}`;
}
export function nextPageTarget(state, inventory) {
  if (!state.next) return null;
  const page = String(state.next);
  const options = inventory.filter(c => String(c.page) === page && c.type === 'hero' && c.kind === 'section');
  const component = options.find(c => !c.cid.includes('.ES.')) || options[0];
  return component || {cid:`${page}.HERO`, page, type:'hero', path:`/${page}/`};
}
export function reviewHref(path, {origin, sid, rater, iteration, enabled}, cid) {
  const url = new URL(path, origin);
  if (sid) {url.searchParams.set('s', sid);url.searchParams.set('r', rater);}
  if (iteration > 1) url.searchParams.set('i', String(iteration));
  if (!enabled) url.searchParams.set('review', 'off');
  if (cid) url.hash = cid;
  return url.pathname + url.search + url.hash;
}
export function summaryHighlights(inventory, signals, limit = 5) {
  const liked = [], disliked = [], guesses = [];
  for (const component of inventory) {
    const row = signals.get(component.cid);
    if (!row) continue;
    const positive = [], negative = [], inherited = [];
    for (const measure of ['style', 'copy']) {
      const value = row[measure], source = row.sources?.[measure] || 'direct';
      if (source === 'inherited') inherited.push(measure);
      else if (source === 'direct' && value >= 4) positive.push({measure, value});
      else if (source === 'direct' && value > 0 && value <= 2) negative.push({measure, value});
    }
    if (positive.length) liked.push({...component, scores:positive});
    if (negative.length) disliked.push({...component, scores:negative});
    if (inherited.length) guesses.push({...component, measures:inherited});
  }
  return Object.fromEntries(Object.entries({liked, disliked, guesses}).map(([key, items]) =>
    [key, {items:items.slice(0, limit), total:items.length}]));
}
