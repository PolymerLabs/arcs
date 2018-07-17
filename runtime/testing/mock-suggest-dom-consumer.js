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
import {MockSlotDomConsumer} from './mock-slot-dom-consumer.js';

// Should this class instead extend SuggestDomConsumer?
export class MockSuggestDomConsumer extends MockSlotDomConsumer {
  constructor(containerKind, suggestion, suggestionContent, eventHandler) {
    super(/* consumeConn= */null, containerKind);
    this._suggestion = suggestion;
    this._suggestionContent = suggestionContent.template ? suggestionContent : {
      template: `<dummy-suggestion>${suggestionContent}</dummy-element>`,
      templateName: 'dummy-suggestion',
      model: {}
    };
    this._setContentPromise = null;
  }

  get suggestion() { return this._suggestion; }
  get templatePrefix() { return 'suggest'; }

  onContainerUpdate(container, originalContainer) {
    super.onContainerUpdate(container, originalContainer);

    if (container) {
      this._setContentPromise = this.setContent(this._suggestionContent, this._eventHandler);
    }
  }
}
