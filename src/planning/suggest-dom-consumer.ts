/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Arc} from '../runtime/arc.js';
import {Modality} from '../runtime/modality.js';
import {SlotDomConsumer, DomRendering} from '../runtime/slot-dom-consumer.js';
import {Content} from '../runtime/slot-consumer.js';
import {Suggestion} from './plan/suggestion.js';

export class SuggestDomConsumer extends SlotDomConsumer {
  _suggestion: Suggestion;
  _suggestionContent;
  _eventHandler;

  constructor(arc: Arc, containerKind: string, suggestion: Suggestion, eventHandler) {
    super(arc, /* consumeConn= */null, containerKind);
    this._suggestion = suggestion;
    this._suggestionContent = SuggestDomConsumer._extractContent(this._suggestion);
    this._eventHandler = eventHandler;
  }

  get suggestion(): Suggestion {
    return this._suggestion;
  }

  get templatePrefix(): string {
    return 'suggest';
  }

  formatContent(content: Content): Content | undefined {
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

  static _extractContent(suggestion: Suggestion) {
    return suggestion.getDescription(Modality.Name.Dom) || {template: suggestion.descriptionText};
  }

  static render(arc: Arc, container, suggestion: Suggestion): SlotDomConsumer {
    const content = SuggestDomConsumer._extractContent(suggestion) as {template, model?};
    if (!content) {
      return undefined;
    }
    const suggestionContainer = Object.assign(document.createElement('suggestion-element'), {plan: suggestion});
    container.appendChild(suggestionContainer, container.firstElementChild);
    const rendering: DomRendering = {container: suggestionContainer, model: content.model};
    const consumer = new SlotDomConsumer(arc);
    consumer.addRenderingBySubId(undefined, rendering);
    consumer.eventHandler = (() => {});
    consumer._stampTemplate(rendering, consumer.createTemplateElement(content.template));
    consumer._onUpdate(rendering);
    return consumer;
  }
}
