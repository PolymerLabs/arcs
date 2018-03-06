import Template from './xen-template.js';
import State from './xen-state.js';
import Element from './xen-element.js';
import Base from './xen-base.js';

// helper for editors that can syntax highlight html template strings
const html = (strings, ...values) => {
  return (strings[0] + values.map((v, i) => v + strings[i + 1]).join('')).trim();
};

const walker = (node, tree) => {
  let subtree = tree;
  if (!subtree) {
    subtree = {};
  }
  const root = node || document.body;
  let index = 1;
  let child = root.firstElementChild;
  while (child) {
    const name = child.localName;
    const clas = customElements.get(name);
    if (clas) {
      const shadow = child.shadowRoot;
      const record = {
        props: child._props,
        state: child._state
      };
      const children = shadow ? walker(shadow) : {};
      if (children) {
        record.children = children;
      }
      subtree[`${name} (${index++})`] = record;
    }
    walker(child, subtree);
    child = child.nextElementSibling;
  }
  return subtree;
};
window.walker = walker;

export default {
  State,
  Template,
  Element,
  Base,
  html,
  walker,
  logFactory: Base.logFactory
};
