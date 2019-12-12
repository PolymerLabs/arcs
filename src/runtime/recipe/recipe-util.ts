/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../platform/assert-web.js';
import {ParticleSpec, HandleConnectionSpec} from '../particle-spec.js';
import {InterfaceType} from '../type.js';

import {HandleConnection} from './handle-connection.js';
import {Direction} from '../manifest-ast-nodes.js';
import {Handle} from './handle.js';
import {Particle} from './particle.js';
import {Recipe, RecipeComponent} from './recipe.js';
import {Id} from '../id.js';
import {Dictionary} from '../hot.js';

export function reverseDirection(direction: Direction): Direction {
  switch (direction) {
    case 'reads':
      return 'writes';
    case 'writes':
      return 'reads';
    case 'reads writes':
      return 'reads writes';
    case '`consumes':
      return '`provides';
    case '`provides':
      return '`consumes';
    case 'any':
      return 'any';
    default:
      // Catch nulls and unsafe values from javascript.
      throw new Error(`Bad direction ${direction}`);
  }
}

export function connectionMatchesHandleDirection(connectionDirection: Direction, handleDirection: Direction): boolean {
  return acceptedDirections(connectionDirection).includes(handleDirection);
}

export function acceptedDirections(direction: Direction): Direction[] {
  // @param direction: the direction of a handleconnection.
  // @return acceptedDirections: the list of directions a handle can have that
  // are allowed with this handle connection.
  //
  switch (direction) {
    case 'any':
      return ['any', 'reads', 'writes', 'reads writes', 'hosts', '`consumes', '`provides'];
    case 'reads':
      return ['any', 'reads', 'reads writes', 'hosts', '`consumes'];
    case 'writes':
      return ['any', 'writes', 'reads writes', '`provides'];
    case 'reads writes':
      return ['any', 'reads writes'];
    case 'hosts':
      return ['any', 'hosts'];
    case '`consumes':
      return ['any', '`consumes'];
    case '`provides':
      return ['any', '`provides'];
    default:
      // Catch nulls and unsafe values from javascript.
      throw new Error(`Bad direction ${direction}`);
  }
}


class Shape {
  recipe: Recipe;
  particles: Dictionary<Particle>;
  handles: Map<string, Handle>;
  reverse: Map<RecipeComponent, string>;
  constructor(recipe: Recipe, particles: Dictionary<Particle>, handles: Map<string, Handle>, hcs: Dictionary<HandleConnection>) {
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
export type DirectionCounts = {[K in Direction]: number};

export type HandleRepr = {localName?: string, handle: string, tags?: string[], direction?: Direction};

type RecipeUtilComponent = RecipeComponent | HandleConnectionSpec;

type Match = {forward: Map<RecipeComponent, RecipeUtilComponent>, reverse: Map<RecipeUtilComponent, RecipeComponent>, score: number};

export class RecipeUtil {
  static makeShape(particles: string[], handles: string[], map: Dictionary<Dictionary<HandleRepr>>, recipe?: Recipe): Shape {
    recipe = recipe || new Recipe();
    const pMap: Dictionary<Particle> = {};
    const hMap: Map<string, Handle> = new Map();
    const hcMap: Dictionary<HandleConnection> = {};
    particles.forEach(particle => pMap[particle] = recipe.newParticle(particle));
    handles.forEach(handle => hMap.set(handle, recipe.newHandle()));
    Object.keys(map).forEach(key => {
      Object.keys(map[key]).forEach(name => {
        const handle: HandleRepr = map[key][name];
        const tags: string[] = handle.tags || [];
        if (handle.localName) {
          hMap.get(handle.handle).localName = handle.localName;
        }

        const connection = pMap[key].addConnectionName(name);
        // NOTE: for now, 'any' on the connection and shape means 'accept anything'.
        connection.direction = handle.direction || 'any';

        hMap.get(handle.handle).tags = tags;
        connection.connectToHandle(hMap.get(handle.handle));
        hcMap[key + ':' + name] = pMap[key].connections[name];
      });
    });
    return new Shape(recipe, pMap, hMap, hcMap);
  }

  static recipeToShape(recipe: Recipe) {
    const particles = {};
    let id = 0;
    recipe.particles.forEach(particle => particles[particle.name] = particle);
    const handles = new Map<string, Handle>();
    recipe.handles.forEach(handle => handles.set('h' + id++, handle));
    const hcs = {};
    recipe.handleConnections.forEach(hc => hcs[hc.particle.name + ':' + hc.name] = hc);
    return new Shape(recipe, particles, handles, hcs);
  }

  static _buildNewHCMatches(recipe: Recipe, shapeHC: HandleConnection, match: Match, outputList: Match[]) {
    const {forward, reverse, score} = match;
    let matchFound = false;
    for (const recipeParticle of recipe.particles) {
      if (!recipeParticle.spec) {
        continue;
      }
      for (const recipeConnSpec of recipeParticle.spec.handleConnections) {
      // TODO are there situations where multiple handleConnections should
      // be allowed to point to the same one in the recipe?
      if (reverse.has(recipeConnSpec)) {
        continue;
      }

      // TODO support unnamed shape particles.
      if (recipeParticle.name !== shapeHC.particle.name) {
        continue;
      }

      if (shapeHC.name && shapeHC.name !== recipeConnSpec.name) {
        continue;
      }

      if (!connectionMatchesHandleDirection(shapeHC.direction, recipeConnSpec.direction)) {
        continue;
      }

      const recipeHC = recipeParticle.connections[recipeConnSpec.name];
      if (shapeHC.handle && recipeHC && recipeHC.handle && shapeHC.handle.localName &&
          shapeHC.handle.localName !== recipeHC.handle.localName) {
        continue;
      }

      // recipeHC is a candidate for shapeHC. shapeHC references a
      // particle, so recipeHC must reference the matching particle,
      // or a particle that isn't yet mapped from shape.
      if (reverse.has(recipeParticle)) {
        if (reverse.get(recipeParticle) !== shapeHC.particle) {
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
      if (shapeHC.handle && recipeHC && recipeHC.handle) {
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
      assert(!newMatch.reverse.has(recipeParticle) || newMatch.reverse.get(recipeParticle) === shapeHC.particle);
      assert(!newMatch.forward.has(shapeHC.particle) || newMatch.forward.get(shapeHC.particle) === recipeParticle);
      newMatch.forward.set(shapeHC.particle, recipeParticle);
      newMatch.reverse.set(recipeParticle, shapeHC.particle);
      if (shapeHC.handle) {
        if (!recipeHC || !recipeHC.handle) {
          if (!newMatch.forward.has(shapeHC.handle)) {
            newMatch.forward.set(shapeHC.handle, null);
            newMatch.score -= 2;
          }
        } else {
          newMatch.forward.set(shapeHC.handle, recipeHC.handle);
          newMatch.reverse.set(recipeHC.handle, shapeHC.handle);
        }
      }
      newMatch.forward.set(shapeHC, recipeConnSpec);
      newMatch.reverse.set(recipeConnSpec, shapeHC);
      outputList.push(newMatch);
      matchFound = true;
    }
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
      const newMatches: Match[] = [];
      RecipeUtil._buildNewParticleMatches(recipe, shapeHC.particle, match, newMatches);
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

  static _buildNewParticleMatches(recipe: Recipe, shapeParticle: Particle, match: Match, newMatches: Match[]) {
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
      const newMatch: Match = {forward: new Map(), reverse: new Map(), score: 0};
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

  static _assignHandlesToEmptyPosition(shape: Shape, match: Match, emptyHandles: Handle[], nullHandles: Handle[]) {
    if (emptyHandles.length === 1) {
      const matches: Match[] = [];
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
    const matches: Match[] = RecipeUtil._assignHandlesToEmptyPosition(shape, match, emptyHandles, nullHandles);
    let newMatches: Match[] = [];
    for (const match of matches) {
      const nullHandles = [...shape.handles.values()].filter(handle => match.forward.get(handle) === null);
      if (nullHandles.length > 0) {
        newMatches = newMatches.concat(
            RecipeUtil._assignHandlesToEmptyPosition(shape, match, [thisHandle], nullHandles));
      } else {
        newMatches = newMatches.concat(match);
      }
    }
    return newMatches;
  }

  static find(recipe: Recipe, shape: Shape): {match: Dictionary<RecipeUtilComponent>, score: number}[] {
    // Particles and Handles are initially stored by a forward map from
    // shape component to recipe component.
    // Handle connections, particles and handles are also stored by a reverse map
    // from recipe component to shape component.

    // Start with a single, empty match
    let matches: Match[] = [{forward: new Map(), reverse: new Map(), score: 0}];
    for (const shapeHC of shape.recipe.handleConnections) {
      const newMatches: Match[] = [];
      for (const match of matches) {
        // collect matching handle connections into a new matches list
        RecipeUtil._buildNewHCMatches(recipe, shapeHC, match, newMatches);
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
      const newMatches: Match[] = [];
      for (const match of matches) {
        RecipeUtil._buildNewParticleMatches(recipe, shapeParticle, match, newMatches);
      }
      matches = newMatches;
    }

    const emptyHandles = recipe.handles.filter(handle => handle.connections.length === 0);

    if (emptyHandles.length > 0) {
      let newMatches: Match[] = [];
      for (const match of matches) {
        const nullHandles = [...shape.handles.values()].filter(handle => match.forward.get(handle) === null);
        if (nullHandles.length > 0) {
          newMatches = newMatches.concat(
              RecipeUtil._assignHandlesToEmptyPosition(shape, match, emptyHandles, nullHandles));
        } else {
          newMatches = newMatches.concat(match);
        }
      }
      matches = newMatches;
    }

    return matches.map((match: {forward: Map<RecipeComponent, RecipeUtilComponent>, score: number}) => {
      const result: Dictionary<RecipeUtilComponent> = {};
      match.forward.forEach((value: RecipeUtilComponent, key: RecipeComponent) => result[shape.reverse.get(key)] = value);
      return {match: result, score: match.score};
    });
  }

  static constructImmediateValueHandle(
      connection: HandleConnection, particleSpec: ParticleSpec, id: Id): Handle {
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
    handle.id = id.toString();
    handle.mappedType = handleType;
    handle.fate = 'copy';
    handle.immediateValue = particleSpec;

    return handle;
  }

  static directionCounts(handle: Handle): DirectionCounts {
    const counts: DirectionCounts = {'reads': 0, 'writes': 0, 'reads writes': 0, 'hosts': 0, '`consumes': 0, '`provides': 0, 'any': 0};
    for (const connection of handle.connections) {
      counts[connection.direction]++;
    }
    counts.reads += counts['reads writes'];
    counts.writes += counts['reads writes'];
    return counts;
  }

  // Returns true if `otherRecipe` matches the shape of recipe.
  static matchesRecipe(recipe: Recipe, otherRecipe: Recipe): boolean {
    const shape = RecipeUtil.recipeToShape(otherRecipe);
    const result = RecipeUtil.find(recipe, shape);
    return result.some(r => r.score === 0);
  }
}
