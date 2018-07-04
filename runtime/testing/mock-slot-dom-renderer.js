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
import {Slot} from '../slot.js';
import {SlotDomRenderer} from '../slot/slot-dom-renderer.js';

export class MockSlotDomRenderer extends SlotDomRenderer {
  constructor(slotContext, slotConsumer) {
    super(slotContext, slotConsumer);
    this._content = {};
  }

  setContent(content, handler) {
    super.setContent(content, handler);

    // Mimics the behaviour of DomSlotRenderer::setContent, where template is only set at first,
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

  createTemplateElement(template) {
    return template;
  }

  getProvidedContainer(innerSlotName) {
    let model = [...this._infoBySubId.values()][0].model;
    if (this.slotConsumer.consumeConn.slotSpec.getProvidedSlotSpec(innerSlotName).isSet &&
        model && model.items && model.items.models) {
      let innerContainers = {};
      for (let itemModel of model.items.models) {
        assert(itemModel.id);
        innerContainers[itemModel.id] = itemModel.id;
      }
      return innerContainers;
    }
    return innerSlotName;
  }

  _onUpdate(info) {}

  _stampTemplate(template) {}

  _initMutationObserver() {}

  _observe() {}

  static findRootContainers(container) {
    return container;
  }
}
