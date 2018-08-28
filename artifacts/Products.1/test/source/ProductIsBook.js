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
      this._handles = handles;
    }
    onHandleSync(handle, model) {
      if (handle.name === 'product') {
        let isBook = handle.type.entitySchema.name.toLowerCase().indexOf('book') >= 0 ||
                     model.category && model.category.toLowerCase().indexOf('book') >= 0 ||
                     model.name && model.name.toLowerCase().indexOf('book') >= 0;
        if (isBook) {
          this._handles.get('book').set(model);
          this.relevance = 5;
        }
      }
    }
  };
});
