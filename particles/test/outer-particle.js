/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
"use strict";

defineParticle(({Particle}) => {
  return class P extends Particle {
    async setViews(views) {
      let arc = await this.constructInnerArc();
      var inputView = views.get('input');
      let outputView = views.get('output');
      let inView = await arc.createView(inputView.type, "input");
      let outView = await arc.createView(outputView.type, "output");
      let particle = await views.get('particle').get();

      var recipe = Particle.buildManifest`
        ${inputView.type.entitySchema}
        ${outputView.type.entitySchema}

        ${particle}

        recipe
          use ${inView} as v1
          use ${outView} as v2
          ${particle.name}
            foo <- v1
            bar -> v2
      `;

      try {
        await arc.loadRecipe(recipe);
        var input = await inputView.get();
        inView.set(input);
        outView.on('change', async () => {
          var output = await outView.get();
          if (output !== undefined)
            outputView.set(output);
        }, this);
      } catch (e) {
        console.log(e);
      }
    }
  }
});
