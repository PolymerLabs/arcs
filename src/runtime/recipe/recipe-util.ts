// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import {assert} from '../../platform/assert-web.js';
import {ParticleSpec} from '../particle-spec.js';
import {InterfaceType} from '../type.js';

import {HandleConnection} from './handle-connection.js';
import {Handle} from './handle.js';
import {Particle} from './particle.js';
import {Recipe} from './recipe.js';

class Shape {
  recipe: Recipe;
  particles: {[index: string]: Particle};
  handles: Map<string, Handle>;
  reverse: Map<Handle | Particle | HandleConnection, string>;
  constructor(recipe: Recipe, particles: {[index: string]: Particle}, handles: Map<string, Handle>, hcs: {[index: string]: HandleConnection}) {
    this.recipe = recipe;
    this.particles = particles;
    this.handles = handles;
    this.reverse = new Map();
    for (const p of Object.keys(particles)) {
      this.reverse.set(particles[p], p);
    }
    for (const h of handles.keys()) {
      this.reverse.set(handles.get(h), h);
    }
    for (const hc of Object.keys(hcs)) {
      this.reverse.set(hcs[hc], hc);
    }
  }
}
type DirectionCounts = {in: number; out: number; inout: number; unknown: number;};

export class RecipeUtil {
  static makeShape(particles, handles, map, recipe?: Recipe) {
    recipe = recipe || new Recipe();
    const pMap = {};
    const hMap = new Map();
    const hcMap = {};
    particles.forEach(particle => pMap[particle] = recipe.newParticle(particle));
    handles.forEach(handle => hMap.set(handle, recipe.newHandle()));
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
        if (handle.localName) {
          hMap.get(handle).localName = handle.localName;
        }

        const connection = pMap[key].addConnectionName(name);
        connection.direction = direction;
        hMap.get(handle).tags = tags;
        connection.connectToHandle(hMap.get(handle));
        hcMap[key + ':' + name] = pMap[key].connections[name];
      });
    });
    return new Shape(recipe, pMap, hMap, hcMap);
  }

  static recipeToShape(recipe) {
    const particles = {};
    let id = 0;
    recipe.particles.forEach(particle => particles[particle.name] = particle);
    const handles = new Map();
    recipe.handles.forEach(handle => handles.set('h' + id++, handle));
    const hcs = {};
    recipe.handleConnections.forEach(hc => hcs[hc.particle.name + ':' + hc.name] = hc);
    return new Shape(recipe, particles, handles, hcs);
  }

  static find(recipe: Recipe, shape: Shape) {

    function _buildNewHCMatches(recipe: Recipe, shapeHC: HandleConnection, match, outputList) {
      const {forward, reverse, score} = match;
      let matchFound = false;
      for (const recipeHC of recipe.handleConnections) {
        // TODO are there situations where multiple handleConnections should
        // be allowed to point to the same one in the recipe?
        if (reverse.has(recipeHC)) {
          continue;
        }

        // TODO support unnamed shape particles.
        if (recipeHC.particle.name !== shapeHC.particle.name) {
          continue;
        }

        if (shapeHC.name && shapeHC.name !== recipeHC.name) {
          continue;
        }

        const acceptedDirections = {'in': ['in', 'inout'], 'out': ['out', 'inout'], '=': ['in', 'out', 'inout'], 'inout': ['inout'], 'host': ['host']};
        if (recipeHC.direction) {
          if (!acceptedDirections[shapeHC.direction].includes(
                  recipeHC.direction)) {
            continue;
          }
        }

        if (shapeHC.handle && recipeHC.handle && shapeHC.handle.localName &&
            shapeHC.handle.localName !== recipeHC.handle.localName) {
          continue;
        }

        // recipeHC is a candidate for shapeHC. shapeHC references a
        // particle, so recipeHC must reference the matching particle,
        // or a particle that isn't yet mapped from shape.
        if (reverse.has(recipeHC.particle)) {
          if (reverse.get(recipeHC.particle) !== shapeHC.particle) {
            continue;
          }
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
            if (reverse.get(recipeHC.handle) !== shapeHC.handle) {
              continue;
            }
          } else if (forward.has(shapeHC.handle) && forward.get(shapeHC.handle) !== null) {
            continue;
          }
          // Check whether shapeHC and recipeHC reference the same handle.
          if (shapeHC.handle.fate !== 'create' || (recipeHC.handle.fate !== 'create' && recipeHC.handle.originalFate !== 'create')) {
            if (Boolean(shapeHC.handle.immediateValue) !== Boolean(recipeHC.handle.immediateValue)) {
              continue; // One is an immediate value handle and the other is not.
            }
            if (recipeHC.handle.immediateValue) {
              if (!recipeHC.handle.immediateValue.equals(shapeHC.handle.immediateValue)) {
                continue; // Immediate values are different.
              }
            } else {
              // Note: the id of a handle with 'copy' fate changes during recipe instantiation, hence comparing to original id too.
              // Skip the check if handles have 'create' fate (their ids are arbitrary).
              if (shapeHC.handle.id !== recipeHC.handle.id && shapeHC.handle.id !== recipeHC.handle.originalId) {
                continue; // This is a different handle.
              }
            }
          }
        }

        // clone forward and reverse mappings and establish new components.
        const newMatch = {forward: new Map(forward), reverse: new Map(reverse), score};
        assert(!newMatch.reverse.has(recipeHC.particle) || newMatch.reverse.get(recipeHC.particle) === shapeHC.particle);
        assert(!newMatch.forward.has(shapeHC.particle) || newMatch.forward.get(shapeHC.particle) === recipeHC.particle);
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

      if (matchFound === false) {
        // Non-null particle in the `forward` map means that some of the particle
        // handle connections were successful matches, but some couldn't be matched.
        // It means that this match in invalid.
        if (match.forward.get(shapeHC.particle)) {
          return;
        }
        // The current handle connection from the shape doesn't match anything
        // in the recipe. Find (or create) a particle for it.
        const newMatches = [];
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

    function _buildNewParticleMatches(recipe: Recipe, shapeParticle: Particle, match, newMatches) {
      const {forward, reverse, score} = match;
      let matchFound = false;
      for (const recipeParticle of recipe.particles) {
        if (reverse.has(recipeParticle)) {
          continue;
        }

        if (recipeParticle.name !== shapeParticle.name) {
          continue;
        }

        let handleNamesMatch = true;
        for (const connectionName of Object.keys(recipeParticle.connections)) {
          const recipeConnection = recipeParticle.connections[connectionName];
          if (!recipeConnection.handle) {
            continue;
          }
          const shapeConnection = shapeParticle.connections[connectionName];
          if (shapeConnection && shapeConnection.handle && shapeConnection.handle.localName && shapeConnection.handle.localName !== recipeConnection.handle.localName) {
            handleNamesMatch = false;
            break;
          }
        }

        if (!handleNamesMatch) {
          continue;
        }

        const newMatch = {forward: new Map(forward), reverse: new Map(reverse), score};
        assert(!newMatch.forward.has(shapeParticle) || newMatch.forward.get(shapeParticle) === recipeParticle);
        assert(!newMatch.reverse.has(recipeParticle) || newMatch.reverse.get(recipeParticle) === shapeParticle);
        newMatch.forward.set(shapeParticle, recipeParticle);
        newMatch.reverse.set(recipeParticle, shapeParticle);
        newMatches.push(newMatch);
        matchFound = true;
      }
      if (matchFound === false) {
        const newMatch = {forward: new Map(), reverse: new Map(), score: 0};
        forward.forEach((value, key) => {
          assert(!newMatch.forward.has(key) || newMatch.forward.get(key) === value);
          newMatch.forward.set(key, value);
        });
        reverse.forEach((value, key) => {
          assert(!newMatch.reverse.has(key) || newMatch.reverse.get(key) === value);
          newMatch.reverse.set(key, value);
        });
        if (!newMatch.forward.has(shapeParticle)) {
          newMatch.forward.set(shapeParticle, null);
          newMatch.score = match.score - 1;
        }
        newMatches.push(newMatch);
      }
    }

    function _assignHandlesToEmptyPosition(match, emptyHandles, nullHandles) {
      if (emptyHandles.length === 1) {
        const matches = [];
        const {forward, reverse, score} = match;
        for (const nullHandle of nullHandles) {
          let tagsMatch = true;
          for (const tag of nullHandle.tags) {
            if (!emptyHandles[0].tags.includes(tag)) {
              tagsMatch = false;
              break;
            }
          }
          if (!tagsMatch) {
            continue;
          }
          const newMatch = {forward: new Map(forward), reverse: new Map(reverse), score: score + 1};
          newMatch.forward.set(nullHandle, emptyHandles[0]);
          newMatch.reverse.set(emptyHandles[0], nullHandle);
          matches.push(newMatch);
        }
        return matches;
      }
      const thisHandle = emptyHandles.pop();
      const matches = _assignHandlesToEmptyPosition(match, emptyHandles, nullHandles);
      let newMatches = [];
      for (const match of matches) {
        const nullHandles = [...shape.handles.values()].filter(handle => match.forward.get(handle) === null);
        if (nullHandles.length > 0) {
          newMatches = newMatches.concat(
              _assignHandlesToEmptyPosition(match, [thisHandle], nullHandles));
        } else {
          newMatches.concat(match);
        }
      }
      return newMatches;
    }

    // Particles and Handles are initially stored by a forward map from
    // shape component to recipe component.
    // Handle connections, particles and handles are also stored by a reverse map
    // from recipe component to shape component.

    // Start with a single, empty match
    let matches = [{forward: new Map(), reverse: new Map(), score: 0}];
    for (const shapeHC of shape.recipe.handleConnections) {
      const newMatches = [];
      for (const match of matches) {
        // collect matching handle connections into a new matches list
        _buildNewHCMatches(recipe, shapeHC, match, newMatches);
      }
      matches = newMatches;
    }

    for (const shapeParticle of shape.recipe.particles) {
      if (Object.keys(shapeParticle.connections).length > 0) {
        continue;
      }
      if (shapeParticle.unnamedConnections.length > 0) {
        continue;
      }
      const newMatches = [];
      for (const match of matches) {
        _buildNewParticleMatches(recipe, shapeParticle, match, newMatches);
      }
      matches = newMatches;
    }

    const emptyHandles = recipe.handles.filter(handle => handle.connections.length === 0);

    if (emptyHandles.length > 0) {
      let newMatches = [];
      for (const match of matches) {
        const nullHandles = [...shape.handles.values()].filter(handle => match.forward.get(handle) === null);
        if (nullHandles.length > 0) {
          newMatches = newMatches.concat(
              _assignHandlesToEmptyPosition(match, emptyHandles, nullHandles));
        } else {
          newMatches.concat(match);
        }
      }
      matches = newMatches;
    }

    return matches.map(({forward, score}) => {
      const match = {};
      forward.forEach((value, key) => match[shape.reverse.get(key)] = value);
      return {match, score};
    });
  }

  static constructImmediateValueHandle(
      connection: HandleConnection, particleSpec: ParticleSpec, id: string): Handle {
    assert(connection.type instanceof InterfaceType);
    
    if (!(connection.type instanceof InterfaceType) ||
        !connection.type.interfaceInfo.restrictType(particleSpec)) {
      // Type of the connection does not match the ParticleSpec.
      return null;
    }
    
    // The connection type may have type variables:
    // E.g. if connection shape requires `in ~a *`
    //      and particle has `in Entity input`
    //      then type system has to ensure ~a is at least Entity.
    // The type of a handle hosting the particle literal has to be
    // concrete, so we concretize connection type with maybeEnsureResolved().
    const handleType = connection.type.clone(new Map());
    handleType.maybeEnsureResolved();

    const handle = connection.recipe.newHandle();
    handle.id = id;
    handle.mappedType = handleType;
    handle.fate = 'copy';
    handle.immediateValue = particleSpec;

    return handle;
  }

  static directionCounts(handle): DirectionCounts {
    const counts: DirectionCounts = {in: 0, out: 0, inout: 0, unknown: 0};
    for (const connection of handle.connections) {
      let direction = connection.direction;
      if (counts[direction] === undefined) {
        direction = 'unknown';
      }
      counts[direction]++;
    }
    counts.in += counts.inout;
    counts.out += counts.inout;
    return counts;
  }

  // Returns true if `otherRecipe` matches the shape of recipe.
  static matchesRecipe(recipe, otherRecipe) {
    const shape = RecipeUtil.recipeToShape(otherRecipe);
    const result = RecipeUtil.find(recipe, shape);
    return result.some(r => r.score === 0);
  }
}
