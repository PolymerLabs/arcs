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
  return class ProductIsBook extends Particle {
    setHandles(handles) {
      this._handles = handles;
    }
    onHandleSync(handle, model) {
      const saysBook = s => s && (s.toLowerCase().indexOf('book') >= 0);
      if (handle.name === 'product') {
        const isBook =
          saysBook(handle.type.getEntitySchema().name)
          || saysBook(model.category)
          || saysBook(model.name)
          ;
        if (isBook) {
          this._handles.get('book').set(model);
          this.relevance = 5;
        }
      }
    }
  };
});
