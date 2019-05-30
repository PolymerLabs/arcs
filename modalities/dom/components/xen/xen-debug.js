/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
export const Debug = (Base, log) => class extends Base {
  _setProperty(name, value) {
    if (Debug.level > 1) {
      if (((name in this._pendingProps) && (this._pendingProps[name] !== value)) || (this._props[name] !== value)) {
        log('props', deepishClone({[name]: value}));
      }
    }
    return super._setProperty(name, value);
  }
  _setState(state) {
    if (typeof state !== 'object') {
      console.warn(`Xen::_setState argument must be an object`);
      return false;
    }
    if (super._setState(state)) {
      if (Debug.level > 1) {
        if (Debug.lastFire) {
          //Debug.lastFire.log('[next state change from] fire', {[Debug.lastFire.name]: Debug.lastFire.detail});
          //Debug.lastFire.log('fire', Debug.lastFire.name, Debug.lastFire.detail);
          log('(fired -->) state', deepishClone(state));
        } else {
          log('state', deepishClone(state));
        }
      }
      return true;
    }
  }
  _setImmutableState(name, value) {
    log('state [immutable]', {[name]: value});
    super._setImmutableState(name, value);
  }
  _fire(name, detail, node, init) {
    Debug.lastFire = {name, detail: deepishClone(detail), log};
    log('fire', {[Debug.lastFire.name]: Debug.lastFire.detail});
    super._fire(name, detail, node, init);
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

// TODO(sjmiles): cloning prevents console log from showing values from the future,
// but this must be a deep clone. Circular objects are not cloned.
const deepishClone = (obj, depth) => {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }
  const clone = Object.create(null);
  for (const n in obj) {
    let value = obj[n];
    //try {
    //  value = JSON.parse(JSON.stringify(value));
    //} catch (x) {
      if (depth < 1) {
        value = deepishClone(obj, (depth || 0) + 1);
      }
    //}
    clone[n] = value;
  }
  return clone;
};

Debug.level = 0;

const _logFactory = (preamble, color, log='log') => console[log].bind(console, `%c${preamble}`, `background: ${color}; color: white; padding: 1px 6px 2px 7px; border-radius: 6px;`);
export const logFactory = (preamble, color, log) => (Debug.level > 0) ? _logFactory(preamble, color, log) : () => {};

export const walker = (node, tree) => {
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
        node: child,
        props: child._props,
        state: child._state
      };
      const children = shadow ? walker(shadow) : {};
      if (children) {
        record.children = children;
      }
      let moniker = `${name}${child.id ? `#${child.id}` : ``} (${index++})`;
      while (subtree[moniker]) {
        moniker += '_';
      }
      subtree[moniker] = record;
    }
    walker(child, subtree);
    child = child.nextElementSibling;
  }
  return subtree;
};
