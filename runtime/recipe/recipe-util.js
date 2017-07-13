// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

let Recipe = require('./recipe.js');

class Shape {
  constructor(recipe, particles, views) {
    this.recipe = recipe;
    this.particles = particles;
    this.views = views;
    this.reverse = new Map();
    for (var p in particles)
      this.reverse.set(particles[p], p);
    this.reverseViews = new Map();
    for (var v in views)
      this.reverse.set(views[v], v);
  }
}

class RecipeUtil {
  static makeShape(particles, views, map, recipe) {
    recipe = recipe || new Recipe();
    var pMap = {};
    var vMap = {};
    particles.forEach(particle => pMap[particle] = recipe.newParticle(particle));
    views.forEach(view => vMap[view] = recipe.newView());
    Object.keys(map).forEach(key => {
      let { name, view } = map[key];
      pMap[key].addConnectionName(name).connectToView(vMap[view]);
    });
    return new Shape(recipe, pMap, vMap);
  }

  static find(recipe, shape) {

    function _buildNewVCMatches(recipe, shapeVC, match, outputList) {
      let {forward, reverse} = match;
      for (var recipeVC of recipe.viewConnections) {
        // TODO are there situations where multiiple viewConnections should
        // be allowed to point to the same one in the recipe?
        if (reverse.has(recipeVC))
          continue;

        // TODO support unnamed shape particles.
        if (recipeVC.particle.name != shapeVC.particle.name)
          continue;

        if (shapeVC.name && shapeVC.name != recipeVC.name)
          continue;

        // recipeVC is a candidate for shapeVC. shapeVC references a
        // particle, so recipeVC must reference the matching particle,
        // or a particle that isn't yet mapped from shape.
        if (reverse.has(recipeVC.particle)) {
          if (reverse.get(recipeVC.particle) != shapeVC.particle)
            continue;
        } else if (forward.has(shapeVC.particle)) {
          // we've already mapped the particle referenced by shapeVC
          // and it doesn't match recipeVC's particle as recipeVC's
          // particle isn't mapped
          continue;
        }

        // shapeVC doesn't necessarily reference a view, but if it does
        // then recipeVC needs to reference the matching view, or one
        // that isn't yet mapped.
        if (shapeVC.view) {
          if (!recipeVC.view)
            continue;
          if (reverse.has(recipeVC.view)) {
            if (reverse.get(recipeVC.view) != shapeVC.view)
              continue;
          } else if (forward.has(shapeVC.view)) {
            continue;
          }
        }

        // clone forward and reverse mappings and establish new components.
        var newMatch = {forward: new Map(), reverse: new Map()};
        forward.forEach((value, key) => newMatch.forward.set(key, value));
        reverse.forEach((value, key) => newMatch.reverse.set(key, value));
        newMatch.forward.set(shapeVC.particle, recipeVC.particle);
        newMatch.reverse.set(recipeVC.particle, shapeVC.particle);
        if (shapeVC.view) {
          newMatch.forward.set(shapeVC.view, recipeVC.view);
          newMatch.reverse.set(recipeVC.view, shapeVC.view);
        }
        newMatch.reverse.set(recipeVC, shapeVC);
        outputList.push(newMatch);
      }
    }

    function _buildNewParticleMatches(recipe, shapeParticle, match, newMatches) {
      let {forward, reverse} = match;
      for (var recipeParticle of recipe.particles) {
        if (reverse.has(recipeParticle))
          continue;

        if (recipeParticle.name != shapeParticle.name)
          continue;
        var newMatch = {forward: new Map(), reverse: new Map()};
        forward.forEach((value, key) => newMatch.forward.set(key, value));
        reverse.forEach((value, key) => newMatch.reverse.set(key, value));
        newMatch.forward.set(shapeParticle, recipeParticle);
        newMatch.reverse.set(recipeParticle, shapeParticle);
        newMatches.push(newMatch);
      }
    }

    // Particles and Views are initially stored by a forward map from
    // shape component to recipe component.
    // View connections, particles and views are also stored by a reverse map
    // from recipe component to shape component.
    var matches = [{forward: new Map(), reverse: new Map()}];
    for (var shapeVC of shape.recipe.viewConnections) {
      var newMatches = [];
      for (var match of matches) {
        _buildNewVCMatches(recipe, shapeVC, match, newMatches);
      }
      matches = newMatches;
    }

    for (var shapeParticle of shape.recipe.particles) {
      if (Object.keys(shapeParticle.connections).length > 0)
        continue;
      if (shapeParticle.unnamedConnections.length > 0)
        continue;
      var newMatches = [];
      for (var match of matches)
        _buildNewParticleMatches(recipe, shapeParticle, match, newMatches);
      matches = newMatches;
    }

    return matches.map(({forward}) => {
      var match = {};
      forward.forEach((value, key) => match[shape.reverse.get(key)] = value);
      return match;
    });
  }
}

module.exports = RecipeUtil;
