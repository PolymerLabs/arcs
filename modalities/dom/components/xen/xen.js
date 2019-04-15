import {Template} from './xen-template.js';
import {XenStateMixin, debounce, nob} from './xen-state.js';
import {XenElementMixin} from './xen-element.js';
import {XenBaseMixin, XenBase} from './xen-base.js';
import {Debug, logFactory, walker} from './xen-debug.js';

// helper for editors that can syntax highlight html template strings
const html = (strings, ...values) => {
  return (strings[0] + values.map((v, i) => v + strings[i + 1]).join('')).trim();
};

Template.html = (...args) => Template.createTemplate(html(...args));

const clone = obj => typeof obj === 'object' ? Object.assign(Object.create(null), obj) : {};

// TODO(sjmiles): properties of Xen include some classes as mixins, some as resolved, we should
// be more explicit

const Xen = {
  State: XenStateMixin,
  Template,
  Element: XenElementMixin,
  BaseMixin: XenBaseMixin,
  Base: XenBase,
  Debug,
  setBoolAttribute: Template.setBoolAttribute,
  html,
  walker,
  logFactory,
  clone,
  nob,
  debounce
};

window.Xen = Xen;
export default Xen;
