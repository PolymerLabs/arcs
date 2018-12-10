import {Template} from './xen-template.js';
import {XenStateMixin, debounce, nob} from './xen-state.js';
import Element from './xen-element.js';
import Base from './xen-base.js';
import {Debug, logFactory, walker} from './xen-debug.js';

// helper for editors that can syntax highlight html template strings
const html = (strings, ...values) => {
  return (strings[0] + values.map((v, i) => v + strings[i + 1]).join('')).trim();
};

Template.html = (...args) => Template.createTemplate(html(...args));

const clone = obj => typeof obj === 'object' ? Object.assign(Object.create(null), obj) : {};

const Xen = {
  State: XenStateMixin,
  Template,
  Element,
  Base,
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
