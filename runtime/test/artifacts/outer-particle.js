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
    async setViews(views) {
      let arc = await this.constructInnerArc();
      let inputHandle = views.get('input');
      let outputHandle = views.get('output');
      let inHandle = await arc.createHandle(inputHandle.type, 'input');
      let outHandle = await arc.createHandle(outputHandle.type, 'output');
      let particle = await views.get('particle').get();

      let recipe = Particle.buildManifest`
        ${particle}

        recipe
          use ${inHandle} as v1
          use ${outHandle} as v2
          ${particle.name}
            foo <- v1
            bar -> v2
      `;

      try {
        await arc.loadRecipe(recipe);
        let input = await inputHandle.get();
        inHandle.set(input);
        outHandle.on('change', async () => {
          let output = await outHandle.get();
          if (output != null) {
            outputHandle.set(output);
          }
        }, this);
      } catch (e) {
        console.log(e);
      }
    }
  };
});
