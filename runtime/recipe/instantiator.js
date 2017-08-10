// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

const assert = require('assert');

class Instantiator {
  static instantiate(recipe, arc) {
    assert(recipe.isResolved(), 'Cannot instantiate an unresolved recipe');
    let recipeViewMap = new Map();
    for (let recipeView of recipe.views) {
      let view;
      if (recipeView.create) {
        view = arc.createView(recipeView.type);
      } else {
        view = arc.viewById(recipeView.id);
        assert(view, `view '${recipeView.id}' is not registered in arc`)
      }
      recipeViewMap.set(recipeView, view);
    }
    for (let recipeParticle of recipe.particles) {
      let particle = arc.instantiateParticle(recipeParticle.spec)
      for (let [name, connection] of Object.entries(recipeParticle.connections)) {
        let view = recipeViewMap.get(connection.view);
        arc.connectParticleToView(particle, recipeParticle, name, view);
      }
    }
    if (arc.pec.slotComposer) {
      arc.pec.slotComposer.initializeRecipe(recipe);
    }
  }
}

module.exports = Instantiator;
