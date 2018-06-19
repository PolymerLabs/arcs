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
      if (handle.name === 'input') {
        this.inHandle.set(model);
      }
      if (handle.name === 'particle') {
        await this.arc.loadRecipe(Particle.buildManifest`
          ${model}

          recipe
            use ${this.inHandle} as handle1
            use ${this.outHandle} as handle2
            ${model.name}
              foo <- handle1
              bar -> handle2
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
