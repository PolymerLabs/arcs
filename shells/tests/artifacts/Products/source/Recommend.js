/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

'use strict';

defineParticle(({Particle}) => {
  return class Recommend extends Particle {
    setHandles(handles) {
      this.handles = handles;
    }
    onHandleSync(handle, model) {
      if (handle.name === 'population') {
        const output = this.handles.get('recommendations');
        for (let i = 0; i < 3 && i < model.length; i++) {
          output.add(model[i]);
        }
        this.relevance = 9;
      }
    }
  };
});
