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
  return class P extends Particle {
    async setHandles(handles) {
      this.arc = await this.constructInnerArc();
      this.outputHandle = handles.get('output');
      this.inHandle = await this.arc.createHandle(handles.get('input').type, 'input');
      this.outHandle = await this.arc.createHandle(this.outputHandle.type, 'output', this);
    }
    async onHandleSync(handle, model) {
      if (handle.name === 'input' && model) {
        this.inHandle.set(model);
      }
      if (handle.name === 'particle0') {
        await this.arc.loadRecipe(Particle.buildManifest`
          ${model}

          recipe
            handle1: use ${this.inHandle}
            handle2: use ${this.outHandle}
            ${model.name}
              foo: reads handle1
              bar: writes handle2
        `);
      }
    }
    async onHandleUpdate(handle, update) {
      if (handle.name === 'output') {
        this.outputHandle.set(update.data);
      }
    }
  };
});
