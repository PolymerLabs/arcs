// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import Recipe from './recipe.js';
import assert from '../../platform/assert-web.js';

class Shape {
  constructor(recipe, particles, views, hcs) {
    this.recipe = recipe;
    this.particles = particles;
    this.views = views;
    this.reverse = new Map();
    for (let p in particles)
      this.reverse.set(particles[p], p);
    for (let v in views)
      this.reverse.set(views[v], v);
    for (let hc in hcs)
      this.reverse.set(hcs[hc], hc);
  }
}

class RecipeUtil {
  static makeShape(particles, views, map, recipe) {
    recipe = recipe || new Recipe();
    let pMap = {};
    let vMap = {};
    let hcMap = {};
    particles.forEach(particle => pMap[particle] = recipe.newParticle(particle));
    views.forEach(view => vMap[view] = recipe.newHandle());
    Object.keys(map).forEach(key => {
      Object.keys(map[key]).forEach(name => {
        let view = map[key][name];
        pMap[key].addConnectionName(name).connectToView(vMap[view]);
        hcMap[key + ':' + name] = pMap[key].connections[name];
      });
    });
    return new Shape(recipe, pMap, vMap, hcMap);
  }

  static recipeToShape(recipe) {
    let particles = {};
    let id = 0;
    recipe.particles.forEach(particle => particles[particle.name] = particle);
    let views = {};
    recipe.handles.forEach(view => views['v' + id++] = view);
    let hcs = {};
    recipe.handleConnections.forEach(hc => hcs[hc.particle.name + ':' + hc.name] = hc);
    return new Shape(recipe, particles, views, hcs);
  }

  static find(recipe, shape) {

    function _buildNewHCMatches(recipe, shapeHC, match, outputList) {
      let {forward, reverse, score} = match;
      let matchFound = false;
      for (let recipeHC of recipe.handleConnections) {
        // TODO are there situations where multiple handleConnections should
        // be allowed to point to the same one in the recipe?
        if (reverse.has(recipeHC))
          continue;

        // TODO support unnamed shape particles.
        if (recipeHC.particle.name != shapeHC.particle.name)
          continue;

        if (shapeHC.name && shapeHC.name != recipeHC.name)
          continue;

        // recipeHC is a candidate for shapeHC. shapeHC references a
        // particle, so recipeHC must reference the matching particle,
        // or a particle that isn't yet mapped from shape.
        if (reverse.has(recipeHC.particle)) {
          if (reverse.get(recipeHC.particle) != shapeHC.particle)
            continue;
        } else if (forward.has(shapeHC.particle)) {
          // we've already mapped the particle referenced by shapeHC
          // and it doesn't match recipeHC's particle as recipeHC's
          // particle isn't mapped
          continue;
        }

        // shapeHC doesn't necessarily reference a handle, but if it does
        // then recipeHC needs to reference the matching handle, or one
        // that isn't yet mapped, or no handle yet.
        if (shapeHC.view && recipeHC.view) {
          if (reverse.has(recipeHC.view)) {
            if (reverse.get(recipeHC.view) != shapeHC.view)
              continue;
          } else if (forward.has(shapeHC.view) && forward.get(shapeHC.view) !== null) {
            continue;
          }
          // Check whether shapeHC and recipeHC reference the same view.
          // Note: the id of a view with 'copy' fate changes during recipe instantiation, hence comparing to original id too.
          // Skip the check if views have 'create' fate (their ids are arbitrary).
          if ((shapeHC.view.fate != 'create' || (recipeHC.view.fate != 'create' && recipeHC.view.originalFate != 'create')) &&
              shapeHC.view.id != recipeHC.view.id && shapeHC.view.id != recipeHC.view.originalId) {
            // this is a different view.
            continue;
          }
        }

        // clone forward and reverse mappings and establish new components.
        let newMatch = {forward: new Map(forward), reverse: new Map(reverse), score};
        assert(!newMatch.forward.has(shapeHC.particle) || newMatch.forward.get(shapeHC.particle) == recipeHC.particle);
        newMatch.forward.set(shapeHC.particle, recipeHC.particle);
        newMatch.reverse.set(recipeHC.particle, shapeHC.particle);
        if (shapeHC.view) {
          if (!recipeHC.view) {
            if (!newMatch.forward.has(shapeHC.view)) {
              newMatch.forward.set(shapeHC.view, null);
              newMatch.score -= 2;
            }
          } else {
            newMatch.forward.set(shapeHC.view, recipeHC.view);
            newMatch.reverse.set(recipeHC.view, shapeHC.view);
          }
        }
        newMatch.forward.set(shapeHC, recipeHC);
        newMatch.reverse.set(recipeHC, shapeHC);
        outputList.push(newMatch);
        matchFound = true;
      }
      if (matchFound == false) {
        let newMatches = [];
        _buildNewParticleMatches(recipe, shapeHC.particle, match, newMatches);
        newMatches.forEach(newMatch => {
          if (shapeHC.view && !newMatch.forward.has(shapeHC.view)) {
            newMatch.forward.set(shapeHC.view, null);
            newMatch.score -= 2;
          }
          newMatch.forward.set(shapeHC, null);
          newMatch.score -= 1;
          outputList.push(newMatch);
        });
      }
    }

    function _buildNewParticleMatches(recipe, shapeParticle, match, newMatches) {
      let {forward, reverse, score} = match;
      let matchFound = false;
      for (let recipeParticle of recipe.particles) {
        if (reverse.has(recipeParticle))
          continue;

        if (recipeParticle.name != shapeParticle.name)
          continue;
        let newMatch = {forward: new Map(forward), reverse: new Map(reverse), score};
        newMatch.forward.set(shapeParticle, recipeParticle);
        newMatch.reverse.set(recipeParticle, shapeParticle);
        newMatches.push(newMatch);
        matchFound = true;
      }
      if (matchFound == false) {
        let newMatch = {forward: new Map(), reverse: new Map(), score: 0};
        forward.forEach((value, key) => newMatch.forward.set(key, value));
        reverse.forEach((value, key) => newMatch.reverse.set(key, value));
        if (!newMatch.forward.has(shapeParticle)) {
          newMatch.forward.set(shapeParticle, null);
          newMatch.score = match.score - 1;
        }
        newMatches.push(newMatch);
      }
    }

    function _assignViewsToEmptyPosition(match, emptyViews, nullViews) {
      if (emptyViews.length == 1) {
        let matches = [];
        let {forward, reverse, score} = match;
        for (let nullView of nullViews) {
          let newMatch = {forward: new Map(forward), reverse: new Map(reverse), score: score + 1};
          newMatch.forward.set(nullView, emptyViews[0]);
          newMatch.reverse.set(emptyViews[0], nullView);
          matches.push(newMatch);
        }
        return matches;
      }
      let thisView = emptyViews.pop();
      let matches = _assignViewsToEmptyPosition(match, emptyViews, nullViews);
      let newMatches = [];
      for (let match of matches) {
        let nullViews = Object.values(shape.views).filter(view => match.forward.get(view) == null);
        if (nullViews.length > 0)
          newMatches = newMatches.concat(_assignViewsToEmptyPosition(match, [thisView], nullViews));
        else
          newMatches.concat(match);
      }
      return newMatches;
    }

    // Particles and Views are initially stored by a forward map from
    // shape component to recipe component.
    // View connections, particles and views are also stored by a reverse map
    // from recipe component to shape component.

    // Start with a single, empty match
    let matches = [{forward: new Map(), reverse: new Map(), score: 0}];
    for (let shapeHC of shape.recipe.handleConnections) {
      let newMatches = [];
      for (let match of matches) {
        // collect matching view connections into a new matches list
        _buildNewHCMatches(recipe, shapeHC, match, newMatches);
      }
      matches = newMatches;
    }

    for (let shapeParticle of shape.recipe.particles) {
      if (Object.keys(shapeParticle.connections).length > 0)
        continue;
      if (shapeParticle.unnamedConnections.length > 0)
        continue;
      let newMatches = [];
      for (let match of matches)
        _buildNewParticleMatches(recipe, shapeParticle, match, newMatches);
      matches = newMatches;
    }

    let emptyViews = recipe.handles.filter(view => view.connections.length == 0);

    if (emptyViews.length > 0) {
      let newMatches = [];
      for (let match of matches) {
        let nullViews = Object.values(shape.views).filter(view => match.forward.get(view) == null);
        if (nullViews.length > 0)
          newMatches = newMatches.concat(_assignViewsToEmptyPosition(match, emptyViews, nullViews));
        else
          newMatches.concat(match);
      }
      matches = newMatches;
    }

    return matches.map(({forward, score}) => {
      let match = {};
      forward.forEach((value, key) => match[shape.reverse.get(key)] = value);
      return {match, score};
    });
  }

  static directionCounts(view) {
    let counts = {'in': 0, 'out': 0, 'inout': 0, 'unknown': 0};
    for (let connection of view.connections) {
      let direction = connection.direction;
      if (counts[direction] == undefined)
        direction = 'unknown';
      counts[direction]++;
    }
    counts.in += counts.inout;
    counts.out += counts.inout;
    return counts;
  }
}

export default RecipeUtil;
