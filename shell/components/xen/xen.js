import Template from './xen-template.js';
import State from './xen-state.js';
import Element from './xen-element.js';
import Base from './xen-base.js';

// helper for editors that can syntax highlight html template strings
const html = (strings, ...values) => {
  return (strings[0] + values.map((v, i) => v + strings[i + 1]).join('')).trim();
};

Template.html = (...args) => Template.createTemplate(html.apply(null, args)); // eslint-disable-line prefer-spread

const Debug = (Base, log) => class extends Base {
  _wouldChangeProp(name, value) {
    let result = true;
    if (typeof value === 'object') {
      result = true;
    }
    if (((name in this._pendingProps) && (this._pendingProps[name] !== value)) || (this._props[name] !== value)) {
      result = true;
      log('props', {[name]: value});
    }
    return result;
  }
  _setState(state) {
    if (super._setState(state)) {
      log('state', state);
      return true;
    }
  }
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
  Debug,
  html,
  walker,
  logFactory: Base.logFactory,
  setBoolAttribute: Template.setBoolAttribute
};
