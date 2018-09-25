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
import {Affordance} from './affordance.js';

export class SuggestionComposer {
  constructor(slotComposer) {
    assert(slotComposer);
    this._affordance = Affordance.forName(slotComposer.affordance);
    this._container = slotComposer.findContainerByName('suggestions');

    this._suggestions = [];
    this._suggestionsQueue = [];
    this._updateComplete = null;

    this._slotComposer = slotComposer;
    this._suggestConsumers = [];
  }

  async setSuggestions(suggestions) {
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

  clear() {
    if (this._container) {
      this._affordance.slotConsumerClass.clear(this._container);
    }
    this._suggestConsumers.forEach(consumer => consumer.dispose());
    this._suggestConsumers = [];
  }

  async _updateSuggestions(suggestions) {
    this.clear();

    let sortedSuggestions = suggestions.sort((s1, s2) => s2.rank - s1.rank);
    for (let suggestion of sortedSuggestions) {
      // TODO(mmandlis): This hack is needed for deserialized suggestions to work. Should
      // instead serialize the description object and generation suggestion content here.
      let suggestionContent = suggestion.suggestionContent ? suggestion.suggestionContent :
        await suggestion.description.getRecipeSuggestion(this._affordance.descriptionFormatter);
      assert(suggestionContent, 'No suggestion content available');

      if (this._container) {
        this._affordance.suggestionConsumerClass.render(this._container, suggestion, suggestionContent);
      }

      this._addInlineSuggestion(suggestion, suggestionContent);
    }
  }

  _addInlineSuggestion(suggestion, suggestionContent) {
    let remoteSlots = suggestion.plan.slots.filter(s => !!s.id);
    if (remoteSlots.length != 1) {
      return;
    }
    let remoteSlot = remoteSlots[0];

    let context = this._slotComposer.findContextById(remoteSlot.id);
    assert(context);

    if (context.spec.isSet) {
      // TODO: Inline suggestion in a set slot is not supported yet. Implement!
      return;
    }

    // Don't put suggestions in context that either (1) is a root context, (2) doesn't have
    // an actual container or (3) is not restricted to specific handles.
    if (!context.sourceSlotConsumer) {
      return;
    }
    if (context.spec.handles.length == 0) {
      return;
    }

    let handleIds = context.spec.handles.map(
      handleName => context.sourceSlotConsumer.consumeConn.particle.connections[handleName].handle.id);
    if (!handleIds.find(handleId => suggestion.plan.handles.find(handle => handle.id == handleId))) {
      // the suggestion doesn't use any of the handles that the context is restricted to.
      return;
    }

    let suggestConsumer = new this._affordance.suggestionConsumerClass(this._slotComposer._containerKind, suggestion, suggestionContent, (eventlet) => {
      let suggestion = this._suggestions.find(s => s.hash == eventlet.data.key);
      suggestConsumer.dispose();
      if (suggestion) {
        let index = this._suggestConsumers.findIndex(consumer => consumer == suggestConsumer);
        assert(index >= 0, 'cannot find suggest slot context');
        this._suggestConsumers.splice(index, 1);

        this._slotComposer.arc.instantiate(suggestion.plan);
      }
    });
    context.addSlotConsumer(suggestConsumer);
    this._suggestConsumers.push(suggestConsumer);
  }
}
