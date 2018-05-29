// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

'use strict';

defineParticle(({Particle}) => {
  return class ProductIsBook extends Particle {
    setHandles(handles) {
      this.on(handles, 'product', 'change', e => {
        let productHandle = handles.get('product');
        productHandle.get().then(data => {
          let isBook = productHandle.type.entitySchema.name.toLowerCase().indexOf('book') >= 0 ||
                       data.category && data.category.toLowerCase().indexOf('book') >= 0 ||
                       data.name && data.name.toLowerCase().indexOf('book') >= 0;
          if (isBook) {
            handles.get('book').set(data);
            this.relevance = 5;
          }
        });
      });
    }
  };
});
