// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import {Recipe} from './recipe.js';
import {assert} from '../../platform/assert-web.js';

class Shape {
  constructor(recipe, particles, handles, hcs) {
    this.recipe = recipe;
    this.particles = particles;
    this.handles = handles;
    this.reverse = new Map();
    for (let p in particles)
      this.reverse.set(particles[p], p);
    for (let h in handles)
      this.reverse.set(handles[h], h);
    for (let hc in hcs)
      this.reverse.set(hcs[hc], hc);
  }
}

export class RecipeUtil {
  static makeShape(particles, handles, map, recipe) {
    recipe = recipe || new Recipe();
    let pMap = {};
    let hMap = {};
    let hcMap = {};
    particles.forEach(particle => pMap[particle] = recipe.newParticle(particle));
    handles.forEach(handle => hMap[handle] = recipe.newHandle());
    Object.keys(map).forEach(key => {
      Object.keys(map[key]).forEach(name => {
        let handle = map[key][name];
        let direction = '=';
        let tags = [];
        if (handle.handle) {
        // NOTE: for now, '=' on the shape means "accept anything". This is going
        // to change when we redo capabilities; for now it's modeled by mapping '=' to
        // '=' rather than to 'inout'.

          direction = {'->': 'out', '<-': 'in', '=': '='}[handle.direction];
          tags = handle.tags || [];
          handle = handle.handle;
        }
        let connection = pMap[key].addConnectionName(name);
        connection.direction = direction;
        hMap[handle].tags = tags;
        connection.connectToHandle(hMap[handle]);
        hcMap[key + ':' + name] = pMap[key].connections[name];
      });
    });
    return new Shape(recipe, pMap, hMap, hcMap);
  }

  static recipeToShape(recipe) {
    let particles = {};
    let id = 0;
    recipe.particles.forEach(particle => particles[particle.name] = particle);
    let handles = {};
    recipe.handles.forEach(handle => handles['h' + id++] = handle);
    let hcs = {};
    recipe.handleConnections.forEach(hc => hcs[hc.particle.name + ':' + hc.name] = hc);
    return new Shape(recipe, particles, handles, hcs);
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

        let acceptedDirections = {'in': ['in', 'inout'], 'out': ['out', 'inout'], '=': ['in', 'out', 'inout'], 'inout': ['inout'], 'host': ['host']};
        if (recipeHC.direction) {
          if (!acceptedDirections[shapeHC.direction].includes(recipeHC.direction))
            continue;
        }

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
        if (shapeHC.handle && recipeHC.handle) {
          if (reverse.has(recipeHC.handle)) {
            if (reverse.get(recipeHC.handle) != shapeHC.handle)
              continue;
          } else if (forward.has(shapeHC.handle) && forward.get(shapeHC.handle) !== null) {
            continue;
          }
          // Check whether shapeHC and recipeHC reference the same handle.
          // Note: the id of a handle with 'copy' fate changes during recipe instantiation, hence comparing to original id too.
          // Skip the check if handles have 'create' fate (their ids are arbitrary).
          if ((shapeHC.handle.fate != 'create' || (recipeHC.handle.fate != 'create' && recipeHC.handle.originalFate != 'create')) &&
              shapeHC.handle.id != recipeHC.handle.id && shapeHC.handle.id != recipeHC.handle.originalId) {
            // this is a different handle.
            continue;
          }
        }

        // clone forward and reverse mappings and establish new components.
        let newMatch = {forward: new Map(forward), reverse: new Map(reverse), score};
        assert(!newMatch.forward.has(shapeHC.particle) || newMatch.forward.get(shapeHC.particle) == recipeHC.particle);
        newMatch.forward.set(shapeHC.particle, recipeHC.particle);
        newMatch.reverse.set(recipeHC.particle, shapeHC.particle);
        if (shapeHC.handle) {
          if (!recipeHC.handle) {
            if (!newMatch.forward.has(shapeHC.handle)) {
              newMatch.forward.set(shapeHC.handle, null);
              newMatch.score -= 2;
            }
          } else {
            newMatch.forward.set(shapeHC.handle, recipeHC.handle);
            newMatch.reverse.set(recipeHC.handle, shapeHC.handle);
          }
        }
        newMatch.forward.set(shapeHC, recipeHC);
        newMatch.reverse.set(recipeHC, shapeHC);
        outputList.push(newMatch);
        matchFound = true;
      }

      if (matchFound == false) {
        // The current handle connection from the shape doesn't match anything
        // in the recipe. Find (or create) a particle for it.
        let newMatches = [];
        _buildNewParticleMatches(recipe, shapeHC.particle, match, newMatches);
        newMatches.forEach(newMatch => {
          // the shape references a handle, might also need to create a recipe
          // handle for it (if there isn't already one from a previous match).
          if (shapeHC.handle && !newMatch.forward.has(shapeHC.handle)) {
            newMatch.forward.set(shapeHC.handle, null);
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

    function _assignHandlesToEmptyPosition(match, emptyHandles, nullHandles) {
      if (emptyHandles.length == 1) {
        let matches = [];
        let {forward, reverse, score} = match;
        for (let nullHandle of nullHandles) {
          let tagsMatch = true;
          for (let tag of nullHandle.tags) {
            if (!emptyHandles[0].tags.includes(tag)) {
              tagsMatch = false;
              break;
            }
          }
          if (!tagsMatch)
            continue;
          let newMatch = {forward: new Map(forward), reverse: new Map(reverse), score: score + 1};
          newMatch.forward.set(nullHandle, emptyHandles[0]);
          newMatch.reverse.set(emptyHandles[0], nullHandle);
          matches.push(newMatch);
        }
        return matches;
      }
      let thisHandle = emptyHandles.pop();
      let matches = _assignHandlesToEmptyPosition(match, emptyHandles, nullHandles);
      let newMatches = [];
      for (let match of matches) {
        let nullHandles = Object.values(shape.handle).filter(handle => match.forward.get(handle) == null);
        if (nullHandles.length > 0)
          newMatches = newMatches.concat(_assignHandlesToEmptyPosition(match, [thisHandle], nullHandles));
        else
          newMatches.concat(match);
      }
      return newMatches;
    }

    // Particles and Handles are initially stored by a forward map from
    // shape component to recipe component.
    // Handle connections, particles and handles are also stored by a reverse map
    // from recipe component to shape component.

    // Start with a single, empty match
    let matches = [{forward: new Map(), reverse: new Map(), score: 0}];
    for (let shapeHC of shape.recipe.handleConnections) {
      let newMatches = [];
      for (let match of matches) {
        // collect matching handle connections into a new matches list
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

    let emptyHandles = recipe.handles.filter(handle => handle.connections.length == 0);

    if (emptyHandles.length > 0) {
      let newMatches = [];
      for (let match of matches) {
        let nullHandles = Object.values(shape.handles).filter(handle => match.forward.get(handle) == null);
        if (nullHandles.length > 0)
          newMatches = newMatches.concat(_assignHandlesToEmptyPosition(match, emptyHandles, nullHandles));
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

  static directionCounts(handle) {
    let counts = {'in': 0, 'out': 0, 'inout': 0, 'unknown': 0};
    for (let connection of handle.connections) {
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
