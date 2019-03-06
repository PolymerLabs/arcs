// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

'use strict';

defineParticle(({Particle}) => {
  return class extends Particle {
    async setHandles(handles) {
      this.arc = await this.constructInnerArc();
      this.fooHandle = handles.get('foo');
      this.innerFooHandle = await this.arc.createHandle(this.fooHandle.type, 'innerFoo', this);
    }
    async onHandleSync(handle, model) {
      if (handle.name === 'hostedParticle') {
        await this.arc.loadRecipe(Particle.buildManifest`
          ${model}
          recipe
            use ${this.innerFooHandle} as h0
            ${model.name}
              innerFoo = h0
        `);
      }
    }
    onHandleUpdate(handle, update) {
      if (handle.name === 'innerFoo') {
        this.fooHandle.set(new this.fooHandle.entityClass({value: `${update.data.value}!!!`}));
      }
    }
  };
});
