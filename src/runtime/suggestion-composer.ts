/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {ModalityHandler} from './modality-handler.js';
import {SlotComposer} from './slot-composer.js';
import {Arc} from './arc.js';
import {Suggestion} from './plan/suggestion.js';
import {SuggestDomConsumer} from './suggest-dom-consumer.js';

export class SuggestionComposer {
  private _container: HTMLElement | undefined; // eg div element.

  private readonly _slotComposer: SlotComposer;
  private readonly arc: Arc;
  private _suggestions: Suggestion[] = [];

  // used in tests
  protected readonly _suggestConsumers: SuggestDomConsumer[] = [];

  constructor(arc: Arc, slotComposer: SlotComposer) {
    this._container = slotComposer.findContainerByName('suggestions');
    this._slotComposer = slotComposer;
    this.arc = arc;
  }

  get modalityHandler(): ModalityHandler { return this._slotComposer.modalityHandler; }

  clear(): void {
    if (this._container) {
      this.modalityHandler.slotConsumerClass.clear(this._container);
    }
    this._suggestConsumers.forEach(consumer => consumer.dispose());
    this._suggestConsumers.length = 0;
  }

  setSuggestions(suggestions: Suggestion[]) {
    this.clear();

    const sortedSuggestions = suggestions.sort(Suggestion.compare);
    for (const suggestion of sortedSuggestions) {
      // TODO(mmandlis): use modality-appropriate description.
      const suggestionContent = {template: suggestion.descriptionText};
      if (!suggestionContent) {
        throw new Error('No suggestion content available');
      }

      if (this._container) {
        this.modalityHandler.suggestionConsumerClass.render(this.arc, this._container, suggestion, suggestionContent);
      }

      this._addInlineSuggestion(suggestion, suggestionContent);
    }
  }

  private _addInlineSuggestion(suggestion, suggestionContent): void {
    const remoteSlots = suggestion.plan.slots.filter(s => !!s.id);
    if (remoteSlots.length !== 1) {
      return;
    }
    const remoteSlot = remoteSlots[0];

    const context = this._slotComposer.findContextById(remoteSlot.id);
    if (!context) {
      throw new Error('Missing context for ' + remoteSlot.id);
    }

    if (context.spec.isSet) {
      // TODO: Inline suggestion in a set slot is not supported yet. Implement!
      return;
    }

    // Don't put suggestions in context that either (1) is a root context, (2) doesn't have
    // an actual container or (3) is not restricted to specific handles.
    if (!context.sourceSlotConsumer) {
      return;
    }
    if (context.spec.handles.length === 0) {
      return;
    }

    const handleIds = context.spec.handles.map(
      handleName => context.sourceSlotConsumer.consumeConn.particle.connections[handleName].handle.id);
    if (!handleIds.find(handleId => suggestion.plan.handles.find(handle => handle.id === handleId))) {
      // the suggestion doesn't use any of the handles that the context is restricted to.
      return;
    }

    const suggestConsumer = new this.modalityHandler.suggestionConsumerClass(this.arc, this._slotComposer.containerKind, suggestion, suggestionContent, (eventlet) => {
      const suggestion = this._suggestions.find(s => s.hash === eventlet.data.key);
      suggestConsumer.dispose();
      if (suggestion) {
        const index = this._suggestConsumers.findIndex(consumer => consumer === suggestConsumer);
        if (index < 0) {
          throw new Error('cannot find suggest slot context');
        }
        this._suggestConsumers.splice(index, 1);

        suggestion.instantiate(this.arc);
      }
    });
    context.addSlotConsumer(suggestConsumer);
    this._suggestConsumers.push(suggestConsumer);
  }
}
