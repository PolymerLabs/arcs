// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

'use strict';

defineParticle(({Particle}) => {
  return class Recommend extends Particle {
    setHandles(handles) {
      this.on(handles, 'population', 'change', e => {
        let populationHandle = handles.get('population');
        populationHandle.toList().then(data => {
          for (let i = 0; i < 3 && i < data.length; i++) {
            handles.get('recommendations').store(data[i]);
          }
          this.relevance = 9;
        });
      });
    }
  };
});
