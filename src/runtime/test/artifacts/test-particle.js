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
  return class Hello extends Particle {
    setHandles(handles) {
      this.barHandle = handles.get('bar');
    }
    onHandleSync(handle, model) {
      if (handle.name === 'foo') {
        this.barHandle.set(new this.barHandle.entityClass({value: model ? model.value + 1 : '0'}));
      }
    }
  };
});
