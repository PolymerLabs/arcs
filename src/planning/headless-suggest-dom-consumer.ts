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
import {Arc} from '../runtime/arc.js';

import {SuggestDomConsumer} from './suggest-dom-consumer.js';
import {Suggestion} from './plan/suggestion.js';

export class HeadlessSuggestDomConsumer extends SuggestDomConsumer {
  _eventHandler;
  _setContentPromise;
  _content;
  contentAvailable;
  _contentAvailableResolve;

  constructor(arc: Arc, containerKind, suggestion: Suggestion, eventHandler) {
    super(arc, containerKind, suggestion, eventHandler);
    this._suggestionContent = this._suggestionContent.template ? this._suggestionContent : {
      template: `<dummy-suggestion>${this._suggestionContent}</dummy-element>`,
      templateName: 'dummy-suggestion',
      model: {}
    };
    this._setContentPromise = null;
    this._content = {};
    this.contentAvailable = new Promise(resolve => this._contentAvailableResolve = resolve);
  }

  get suggestion() { return this._suggestion; }
  get templatePrefix() { return 'suggest'; }

  onContainerUpdate(container, originalContainer) {
    super.onContainerUpdate(container, originalContainer);

    if (container) {
      this.setContent(this._suggestionContent, this._eventHandler);
    }
  }

  static render(arc: Arc, container, suggestion: Suggestion): SuggestDomConsumer {
    return undefined;
  }

  setContent(content, handler) {
    super.setContent(content, handler);

    // Mimics the behaviour of DomSlotConsumer::setContent, where template is only set at first,
    // and model is overriden every time.
    if (content) {
      this._content.templateName = content.templateName;
      if (content.template) {
        this._content.template = content.template;
      }
      this._content.model = content.model;
      this._contentAvailableResolve();
    } else {
      this._content = {};
    }
  }
  createNewContainer(container, subId) {
    return container;
  }
  isSameContainer(container, contextContainer) {
    return container === contextContainer;
  }
  getInnerContainer(slotId) {
    const model = Array.from(this.renderings, ([_, {model}]) => model)[0];
    const providedContext = this.findProvidedContext(ctx => ctx.id === slotId);
    if (!providedContext) {
      console.warn(`Cannot find provided spec for ${slotId} in ${this.consumeConn.getQualifiedName()}`);
      return;
    }
    if (providedContext.spec.isSet && model && model.items && model.items.models) {
      const innerContainers = {};
      for (const itemModel of model.items.models) {
        assert(itemModel.id);
        innerContainers[itemModel.id] = itemModel.id;
      }
      return innerContainers;
    }
    return slotId;
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
  _initMutationObserver(): MutationObserver { return null; }
  _observe() {}
}
