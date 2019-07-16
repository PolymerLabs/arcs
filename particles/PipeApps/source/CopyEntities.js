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

defineParticle(({Particle}) => {
  return class CopyEntities extends Particle {
    setHandles(handles) {
      this.handles = handles;
    }

    async onHandleSync(handle, model) {
      if (handle.name === 'source') {
        const entities = await handle.toList();
        this.relevance = await this._copyAll(entities);
      }
    }

    async onHandleUpdate(handle, update) {
      if (handle.name === 'source' && update.added) {
        this.relevance = await this._copyAll(update.added);
      }
    }

    async _copyAll(entities) {
      let count = 0;
      for (let i = 0; i < entities.length; ++i) {
        count += await this._addEntity(entities[i]);
      }
      return count;
    }

    async _addEntity(entity) {
      if (entity.type === 'place') {
        const placesHandle = this.handles.get('places');
        await placesHandle.store(new placesHandle.entityClass(JSON.parse(entity.jsonData)));
        return 1;
      }
      return 0;
    }
  };
});
