/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
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
      this.bHandle = handles.get('b');
      this.dHandle = handles.get('d');
    }
    onHandleSync(handle, model) {
      const newValue = {value: model ? model.value + 1 : '0'};
      if (handle.name === 'a') {
        this.bHandle.set(new this.bHandle.entityClass(newValue));
      } else if (handle.name === 'c') {
        if (this.dHandle) {
          this.dHandle.set(new this.dHandle.entityClass(newValue));
        }
      }
    }
  };
});
