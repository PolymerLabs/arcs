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

// Note: this is a temporary particle that fakes a Place entity in the incoming entities store.
defineParticle(({Particle}) => {
  return class RecognizeEntity extends Particle {
    setHandles(handles) {
      const entitiesHandle = handles.get('entities');
      const fakePlace = new entitiesHandle.entityClass({
          type: 'place',
          jsonData: '{"name": "The Best Cafe", "address": "123 Main st. Townville Countryland"}',
          source: 'maps'
      });
      entitiesHandle.store(fakePlace);
    }
  };
});
