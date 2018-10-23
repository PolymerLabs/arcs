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

import {assert} from '../../platform/assert-web.js';
import {SlotDomConsumer} from '../ts-build/slot-dom-consumer.js';

export class MockSlotDomConsumer extends SlotDomConsumer {
  constructor(consumeConn) {
    super(consumeConn);
    this._content = {};
  }

  async setContent(content, handler) {
    await super.setContent(content, handler);

    // Mimics the behaviour of DomSlotConsumer::setContent, where template is only set at first,
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
  createNewContainer(container, subId) {
    return container;
  }

  isSameContainer(container, contextContainer) {
    return container == contextContainer;
  }

  getInnerContainer(innerSlotName) {
    const model = this.renderings.map(([subId, {model}]) => model)[0];
    const providedSlotSpec = this.consumeConn.slotSpec.getProvidedSlotSpec(innerSlotName);
    if (!providedSlotSpec) {
      console.warn(`Cannot find provided spec for ${innerSlotName} in ${this.consumeConn.getQualifiedName()}`);
      return;
    }
    if (providedSlotSpec.isSet && model && model.items && model.items.models) {
      const innerContainers = {};
      for (const itemModel of model.items.models) {
        assert(itemModel.id);
        innerContainers[itemModel.id] = itemModel.id;
      }
      return innerContainers;
    }
    return innerSlotName;
  }

  createTemplateElement(template) {
    return template;
  }

  static findRootContainers(container) {
    return container;
  }

  static clear(container) {}
  _onUpdate(rendering) {}
  _stampTemplate(template) {}
  _initMutationObserver() {}
  _observe() {}
}
