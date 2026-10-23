// A deliberately small DOM double: exercises initializer behavior, not browser layout.
import { parse } from 'ultrahtml';
import { unescape } from 'html-escaper';
import { readFileSync } from 'node:fs';
import { transpileModule, ModuleKind, ScriptTarget } from 'typescript';

export class Element {
  constructor(tag = '', attrs = {}, text = '') {
    this.tagName = tag;
    this.attrs = { ...attrs };
    this.nodes = [];
    this.text = text;
    this.events = new Map();
    this.value = '';
    this.open = false;
    this.dataset = new Proxy({}, {
      get: (_, key) => this.getAttribute('data-' + key.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())) ?? undefined,
      set: (_, key, value) => { this.setAttribute('data-' + key.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase()), value); return true; },
    });
    this.classList = { toggle: (name, enabled) => {
      const classes = new Set(this.className.split(/\s+/).filter(Boolean));
      if (enabled) classes.add(name); else classes.delete(name);
      this.className = [...classes].join(' ');
    } };
  }
  get children() { return this.nodes.filter((node) => node.tagName && node.tagName !== '#text'); }
  get textContent() { return this.text + this.nodes.map((node) => node.textContent).join(''); }
  set textContent(text) { this.text = text; this.nodes = []; }
  get className() { return this.attrs.class || ''; }
  set className(value) { this.attrs.class = value; }
  get hidden() { return this.hasAttribute('hidden'); }
  set hidden(value) { if (value) this.setAttribute('hidden', ''); else this.removeAttribute('hidden'); }
  get disabled() { return this.hasAttribute('disabled'); }
  set disabled(value) { if (value) this.setAttribute('disabled', ''); else this.removeAttribute('disabled'); }
  get isConnected() { return true; }
  setAttribute(key, value) { this.attrs[key] = String(value); }
  getAttribute(key) { return this.attrs[key] ?? null; }
  hasAttribute(key) { return key in this.attrs; }
  removeAttribute(key) { delete this.attrs[key]; }
  append(...nodes) {
    for (const node of nodes) {
      if (node.tagName === '#fragment') this.append(...node.nodes);
      else this.nodes.push(node);
    }
  }
  replaceChildren(...nodes) { this.nodes = []; this.text = ''; this.append(...nodes); }
  matches(selector) {
    if (selector.startsWith('#')) return this.attrs.id === selector.slice(1);
    if (selector.startsWith('.')) return this.className.split(/\s+/).includes(selector.slice(1));
    const attr = selector.match(/^\[([^=\]]+)(?:="([^"]*)")?\]$/);
    if (attr) return this.hasAttribute(attr[1]) && (attr[2] === undefined || this.attrs[attr[1]] === attr[2]);
    return this.tagName === selector;
  }
  querySelectorAll(selector) { return this.children.flatMap((child) => [...(child.matches(selector) ? [child] : []), ...child.querySelectorAll(selector)]); }
  querySelector(selector) { return this.querySelectorAll(selector)[0] ?? null; }
  addEventListener(name, callback) {
    if (!this.events.has(name)) this.events.set(name, []);
    this.events.get(name).push(callback);
  }
  dispatch(name, extra = {}) {
    const event = { target: this, preventDefault() {}, ...extra };
    for (const callback of this.events.get(name) || []) callback(event);
  }
  click() { if (!this.disabled) this.dispatch('click'); }
  focus() { this.focused = true; }
  select() { this.selected = true; }
  showModal() { this.open = true; }
  close() { this.open = false; this.dispatch('close'); }
}

export function documentFromHTML(html) {
  function convert(node) {
    const element = new Element(node.name || (node.type === 2 ? '#text' : ''),
      Object.fromEntries(Object.entries(node.attributes || {}).map(([key, value]) => [key, unescape(value)])),
      node.type === 2 ? unescape(node.value) : '');
    element.append(...(node.children || []).filter((child) => child.type === 1 || child.type === 2).map(convert));
    return element;
  }
  // ultrahtml stops a tag at literal > even inside quoted attributes. Such
  // attributes are valid HTML; escape angle brackets before parsing the double.
  const parserHTML = html.replace(/(\s[\w:-]+=)(["'])(.*?)\2/gs, (_, prefix, quote, value) =>
    prefix + quote + value.replaceAll('<', '&lt;').replaceAll('>', '&gt;') + quote);
  const document = convert(parse(parserHTML));
  document.createElement = (tag) => new Element(tag);
  document.createDocumentFragment = () => new Element('#fragment');
  return document;
}

export const readBuild = (route) => readFileSync(new URL(`../../dist/${route}/index.html`, import.meta.url), 'utf8');
export const settle = () => new Promise((resolve) => setTimeout(resolve, 100));

export async function runInitializer(route, document, dependencies, fetch, navigator = {}) {
  let source = readFileSync(new URL(`../../src/scripts/${route}/browser.ts`, import.meta.url), 'utf8');
  source = source.replace(/^import .*;\n/gm, '')
    .replace("import('../../data/kaomoji/index')", 'Promise.resolve(kaomojiModule)')
    .replaceAll('import.meta.env.BASE_URL', "'/tools'")
    .replace('void initialize();', 'return initialize();');
  const js = transpileModule(source, { compilerOptions: { module: ModuleKind.ESNext, target: ScriptTarget.ES2022 } }).outputText;
  await new Function(...Object.keys(dependencies), 'document', 'fetch', 'navigator', 'console', js)(
    ...Object.values(dependencies), document, fetch, navigator, { error() {} });
}
