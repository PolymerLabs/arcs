/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {Affordance} from './affordance.js';
import {SlotComposer} from './slot-composer.js';
import {Suggestion} from './plan/suggestion';
import {SuggestDomConsumer} from '../suggest-dom-consumer.js';

export class SuggestionComposer {
  private _affordance: Affordance;
  private _container: HTMLElement | undefined; // eg div element.

  private readonly _slotComposer: SlotComposer;
  private _suggestions: Suggestion[] = []; 
  private _suggestionsQueue = [];
  private _updateComplete = null;
  private _suggestConsumers: SuggestDomConsumer = [];
  
  constructor(slotComposer: SlotComposer) {
    this._affordance = Affordance.forName(slotComposer.affordance);
    this._container = slotComposer.findContainerByName('suggestions');
    this._slotComposer = slotComposer;
  }

  async setSuggestions(suggestions: Suggestion[]) {
    this._suggestionsQueue.push(suggestions);
    Promise.resolve().then(async () => {
      if (this._updateComplete) {
        await this._updateComplete;
      }
      if (this._suggestionsQueue.length > 0) {
        this._suggestions = this._suggestionsQueue.pop();
        this._suggestionsQueue = [];
        this._updateComplete = this._updateSuggestions(this._suggestions);
      }
    });
  }

  clear(): void {
    if (this._container) {
      this._affordance.slotConsumerClass.clear(this._container);
    }
    this._suggestConsumers.forEach(consumer => consumer.dispose());
    this._suggestConsumers = [];
  }

  private async _updateSuggestions(suggestions) {
    this.clear();

    const sortedSuggestions = suggestions.sort(Suggestion.compare);
    for (const suggestion of sortedSuggestions) {
      // TODO(mmandlis): This hack is needed for deserialized suggestions to work. Should
      // instead serialize the description object and generation suggestion content here.
      const suggestionContent = suggestion.descriptionDom ? suggestion.descriptionDom :
        await suggestion.description.getRecipeSuggestion(this._affordance.descriptionFormatter);
      if (!suggestionContent) {
        throw new Error('No suggestion content available');
      }

      if (this._container) {
        this._affordance.suggestionConsumerClass.render(this._container, suggestion, suggestionContent);
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

    const suggestConsumer = new this._affordance.suggestionConsumerClass(this._slotComposer.containerKind, suggestion, suggestionContent, (eventlet) => {
      const suggestion = this._suggestions.find(s => s.hash === eventlet.data.key);
      suggestConsumer.dispose();
      if (suggestion) {
        const index = this._suggestConsumers.findIndex(consumer => consumer === suggestConsumer);
        if (index < 0) {
          throw new Error('cannot find suggest slot context');
        }
        this._suggestConsumers.splice(index, 1);

        this._slotComposer.arc.instantiate(suggestion.plan);
      }
    });
    context.addSlotConsumer(suggestConsumer);
    this._suggestConsumers.push(suggestConsumer);
  }
}
