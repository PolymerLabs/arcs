import XenState from "./xen-state.js";
import XenElement from "./xen-element.js";
import Xen from './xen-template.js';

class XenBase extends XenElement(XenState(HTMLElement)) {
  get template() {
    // TODO(sjmiles): null check module?
    const module = this.constructor.module;
    return module ? module.querySelector('template') : '';
  }
  get host() {
    return this.shadowRoot || this.attachShadow({mode: `open`});
  }
  _doMount() {
    this._stamp();
    this._invalidate();
  }
  _stamp() {
    let template = this.template;
    if (template) {
      // TODO(sjmiles): can just do `events(this)` for default listener (`events(this)`), but we use a custom listener
      // so we can append (props, state) to handler signature. All we are really altering is the delegation,
      // not the listening, maybe there could be another customization point just for that. Perhaps the default
      // listener could invoke a delegator if it exists, then fallback to original behavior.
      this._dom = Xen.stamp(this.template).events(this._listener.bind(this)).appendTo(this.host);
    }
  }
  _listener(node, name, handler) {
    node.addEventListener(name, e => {
      if (this[handler]) {
        return this[handler](e, e.detail, this._props, this._state);
      }
    });
  }
  _update(props, state, lastProps, lastState) {
    let model = this._render(props, state, lastProps, lastState);
    if (this._dom) {
      if (Array.isArray(model)) {
        model = model.reduce((sum, value) => Object.assign(sum, value), Object.create(null));
      }
      this._dom.set(model);
    }
  }
  _render(/*props, state, lastProps, lastState*/) {
  }
  _didUpdate(props, state, lastProps, lastState) {
    this._didRender(props, state, lastProps, lastState);
  }
  _didRender(/*props, state, lastProps, lastState*/) {
  }
}
XenBase.logFactory = (preamble, color, log='log') => console[log].bind(console, `%c${preamble}`, `background: ${color}; color: white; padding: 1px 6px 2px 7px; border-radius: 6px;`);
XenBase.log = XenBase.logFactory('XenBase', '#673AB7');

export default XenBase;
