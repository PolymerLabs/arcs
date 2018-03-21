import Template from './xen-template.js';
import State from './xen-state.js';
import Element from './xen-element.js';
import Base from './xen-base.js';

// helper for editors that can syntax highlight html template strings
const html = (strings, ...values) => {
  return (strings[0] + values.map((v, i) => v + strings[i + 1]).join('')).trim();
};

Template.html = (...args) => Template.createTemplate(html.apply(null, args)); // eslint-disable-line prefer-spread

// TODO(sjmiles): cloning prevents console log from showing values from the future
const clone = obj => typeof obj === 'object' ? Object.assign(Object.create(null), obj) : obj;

const Debug = (Base, log) => class extends Base {
  _setProperty(name, value) {
    if (Debug.level > 1) {
      if (((name in this._pendingProps) && (this._pendingProps[name] !== value)) || (this._props[name] !== value)) {
        log('props', clone({[name]: value}));
      }
    }
    return super._setProperty(name, value);
  }
  _setState(state) {
    if (super._setState(state)) {
      if (Debug.level > 1) {
        if (Debug.lastFire) {
          //Debug.lastFire.log('fire', {[Debug.lastFire.name]: Debug.lastFire.detail});
          Debug.lastFire.log('fire', Debug.lastFire.name, Debug.lastFire.detail);
        }
        log('state', clone(state));
      }
      return true;
    }
  }
  _setImmutableState(name, value) {
    log('state [immutable]', {[name]: value});
    super._setImmutableState(name, value);
  }
  _fire(name, detail) {
    Debug.lastFire = {name, detail: clone(detail), log};
    super._fire(name, detail);
    Debug.lastFire = null;
  }
  _doUpdate(...args) {
    if (Debug.level > 2) {
      log('updating...');
    }
    return super._doUpdate(...args);
  }
  _invalidate() {
    if (Debug.level > 2) {
      if (!this._validator) {
        log('invalidating...');
      }
    }
    super._invalidate();
  }
};

Debug.level = 1;

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
