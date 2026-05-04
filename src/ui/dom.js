// Tiny DOM helpers — the only DOM utility module. Keeps the screens
// readable without pulling in a templating library.

export function el(tag, attrs = {}, text) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null) continue;
    if (k === 'value') {
      node.value = v;
    } else if (k === 'disabled') {
      node.disabled = !!v;
    } else if (k === 'checked') {
      node.checked = !!v;
    } else {
      node.setAttribute(k, v);
    }
  }
  if (text !== undefined) node.textContent = text;
  return node;
}

export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}
