/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {SlotDomConsumer} from '../runtime/slot-dom-consumer.js';
import {Suggestion} from './plan/suggestion.js';
import {Arc} from '../runtime/arc.js';

export class SuggestDomConsumer extends SlotDomConsumer {
  _suggestion: Suggestion;
  _suggestionContent;
  _eventHandler;

  constructor(arc: Arc, containerKind: string, suggestion: Suggestion, suggestionContent, eventHandler) {
    super(arc, /* consumeConn= */null, containerKind);
    this._suggestion = suggestion;
    this._suggestionContent = suggestionContent;
    this._eventHandler = eventHandler;
  }

  get suggestion(): Suggestion {
    return this._suggestion;
  }

  get templatePrefix(): string {
    return 'suggest';
  }

  formatContent(content) {
    return {
      template: `<suggestion-element inline key="{{hash}}" on-click="">${content.template}</suggestion-element>`,
      templateName: 'suggestion',
      model: {hash: this.suggestion.hash, ...content.model}
    };
  }

  onContainerUpdate(container, originalContainer): void {
    super.onContainerUpdate(container, originalContainer);

    if (container) {
      this.setContent(this._suggestionContent, this._eventHandler);
    }
  }

  static render(arc: Arc, container, plan, content): SlotDomConsumer {
    const suggestionContainer = Object.assign(document.createElement('suggestion-element'), {plan});
    container.appendChild(suggestionContainer, container.firstElementChild);
    const rendering = {container: suggestionContainer, model: content.model};
    const consumer = new SlotDomConsumer(arc);
    consumer.addRenderingBySubId(undefined, rendering);
    consumer.eventHandler = (() => {});
    consumer._stampTemplate(rendering, consumer.createTemplateElement(content.template));
    consumer._onUpdate(rendering);
    return consumer;
  }
}
