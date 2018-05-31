/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
'use strict';

import {assert} from '../test/chai-web.js';
import {DomSlot} from '../dom-slot.js';
import {DomContext} from '../dom-context.js';
import {DomSetContext} from '../dom-set-context.js';

export class MockDomSlot extends DomSlot {
  constructor(consumeConn, arc) {
    super(consumeConn, arc);
    this._content = {};
  }
  setContent(content, handler) {
    super.setContent(content, handler);

    // Mimics the behaviour of DomSlot::setContent, where template is only set at first,
    // and model is overriden every time.
    if (content) {
      this._content.templateName = content.templateName;
      if (content.template) {
        this._content.template = content.template;
      }
      this._content.model = content.model;
    } else {
      this._content = {};
    }
  }
  getInnerContext(slotName) {
    if (this._content.template) {
      let template = typeof this._content.template == 'string' ? this._content.template : Object.values(this._content.template)[0];
      if (template.indexOf(`slotid="${slotName}"`) > 0) {
        let providedSpec = this.consumeConn.slotSpec.getProvidedSlotSpec(slotName);
        assert(providedSpec, `No provided slot spec for  ${slotName}`);
        if (providedSpec.isSet) {
          let res = {};
          let items = this._model && this._model.items ? Array.isArray(this._model.items) ? this._model.items : this._model.items.models : [{id: ''}];
          items.forEach(m => res[m.id] = '<div></div>');
          return res;
        }
        return '<div></div>';
      }
    }
  }
  _createDomContext() {
    return this.consumeConn.slotSpec.isSet ? new DomSetContext(null, MockDomContext) : new MockDomContext();
  }
  _initMutationObserver() {}
  async populateHandleDescriptions() {}
}

export class MockDomContext extends DomContext {
  observe(observer) {}
  stampTemplate(eventHandler) {}
  initContext(context) {
    this._context = context;
  }
  createTemplateElement(template) {
    return template;
  }
  _setParticleName(name) {
  }
  getInnerContext(innerSlotName) {
    return 'dummy-inner-context';
  }
  updateModel(model) {
  }
  isEqual(context) {
    return this == context;
  }
  clear() {}
}
