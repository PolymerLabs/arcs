/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

'use strict';

// A silly particle which adds a smiley to the end of every chat message.
defineParticle(({Particle}) => {
  return class SmileyAdder extends Particle {
    onHandleSync(handle, model) {
      super.onHandleSync(handle, model);
      if (handle.name !== 'messages') {
        return;
      }
      this.messages = model;
      for (const message of this.messages) {
        this._addASmiley(message);
      }
    }

    onHandleUpdate(handle, update) {
      super.onHandleUpdate(handle, update);
      if (handle.name !== 'messages' || !update.added) {
        return;
      }
      for (const message of update.added) {
        this._addASmiley(message);
      }
    }

    /** Modifies a Message entity to add a smiley face to the end. */
    _addASmiley(message) {
      if (message.text.endsWith('🙂')) {
        return;
      }
      const happyHandle = this.handles.get('happy');
      const happyEntity = new happyHandle.entityClass({
        index: message.index,
        text: message.text + ' 🙂',
      });
      happyHandle.store(happyEntity);
    }
  };
});
