/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {assert} from '../platform/assert-web.js';
import {Slot} from './slot.js';
import {DomSlot} from './dom-slot.js';
import {DomContext} from './dom-context.js';
import {DescriptionDomFormatter} from './description-dom-formatter.js';

export class Affordance {
  constructor(options) {
    Object.keys(options).forEach(key => {
      this[`_${key}`] = options[key];
      Object.defineProperty(this, [key], {
        get: function() {
          return this[`_${key}`];
        }});
    });
  }
  static forName(name) {
    assert(_affordances[name], `Unsupported affordance ${name}`);
    return _affordances[name];
  }
}

let _affordances = {};
[
  {name: 'dom', slotClass: DomSlot, contextClass: DomContext, descriptionFormatter: DescriptionDomFormatter},
  {name: 'dom-touch', slotClass: DomSlot, contextClass: DomContext, descriptionFormatter: DescriptionDomFormatter},
  {name: 'vr', slotClass: DomSlot, contextClass: DomContext, descriptionFormatter: DescriptionDomFormatter},
  {name: 'mock', slotClass: Slot}
].forEach(options => _affordances[options.name] = new Affordance(options));
