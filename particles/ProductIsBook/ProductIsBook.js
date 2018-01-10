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
    setViews(views) {
      this.on(views, 'product', 'change', e => {
        var productHandle = views.get('product');
        productHandle.get().then(data => {
          let isBook = productHandle.type.entitySchema.name.toLowerCase().indexOf('book') >= 0 ||
                       data.category && data.category.toLowerCase().indexOf('book') >= 0 ||
                       data.name && data.name.toLowerCase().indexOf('book') >= 0;
          if (isBook) {
            views.get('book').set(data);
            this.relevance = 5;
          }
        });
      });
    }
  };
});
