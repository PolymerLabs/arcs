/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../../platform/assert-web.js';
import {ParticleSpec} from '../../arcs-types/particle-spec.js';

import {RELAXATION_KEYWORD} from '../../manifest-ast-types/manifest-ast-nodes.js';
import {Direction} from '../../arcs-types/enums.js';
import {Comparable, compareArrays, compareComparables, compareStrings, compareBools} from '../../../utils/comparable.js';
import {Recipe, CloneMap} from './recipe.js';
import {RecipeComponent, ToStringOptions, EndPoint as PublicEndPoint, ParticleEndPoint as PublicParticleEndPoint,
  HandleEndPoint as PublicHandleEndPoint, TagEndPoint as PublicTagEndPoint, EndPointSelector,
  InstanceEndPoint as PublicInstanceEndPoint, Handle} from './recipe-interface.js';
import {Particle} from './particle.js';
import {Producer} from '../../../utils/hot.js';

export abstract class EndPoint implements Comparable<EndPoint>, PublicEndPoint {
  abstract _compareTo(other: EndPoint): number;
  abstract _clone(cloneMap?: CloneMap): EndPoint;
  abstract toString(nameMap?: ReadonlyMap<RecipeComponent, string>): string;
  select(selector: EndPointSelector) {
    if (this instanceof ParticleEndPoint && selector.isParticleEndPoint) {
      selector.isParticleEndPoint(this);
    }
    else if (this instanceof HandleEndPoint && selector.isHandleEndPoint) {
      selector.isHandleEndPoint(this);
    }
    else if (this instanceof TagEndPoint && selector.isTagEndPoint) {
      selector.isTagEndPoint(this);
    }
    else if (this instanceof InstanceEndPoint && selector.isInstanceEndPoint) {
      selector.isInstanceEndPoint(this);
    }
  }

  requireInstanceEndPoint(errorMessage: Producer<string>): InstanceEndPoint {
    if (this instanceof InstanceEndPoint) {
      return this;
    }
    throw new TypeError(errorMessage());
  }

  requireParticleEndPoint(errorMessage: Producer<string>): ParticleEndPoint {
    if (this instanceof ParticleEndPoint) {
      return this;
    }
    throw new TypeError(errorMessage());
  }
}

export class ParticleEndPoint extends EndPoint implements PublicParticleEndPoint {
  particle: ParticleSpec;
  connection: string;

  constructor(particle: ParticleSpec, connection: string) {
    super();
    this.particle = particle;
    this.connection = connection;
  }

  _clone(cloneMap?: CloneMap): ParticleEndPoint {
    return new ParticleEndPoint(this.particle, this.connection);
  }

  _compareTo(other: ParticleEndPoint): number {
    let cmp: number;
    if ((cmp = compareStrings(this.particle.name, other.particle.name)) !== 0) return cmp;
    if ((cmp = compareStrings(this.connection, other.connection)) !== 0) return cmp;
    return 0;
  }

  toString(nameMap?: ReadonlyMap<RecipeComponent, string>): string {
    if (!this.connection) {
      return `${this.particle.name}`;
    }
    return `${this.particle.name}.${this.connection}`;
  }
}

export class InstanceEndPoint extends EndPoint implements PublicInstanceEndPoint {
  instance: Particle;
  connection: string;
  constructor(instance: Particle, connection: string) {
    super();
    assert(instance);
    //this.recipe = instance.recipe;
    this.instance = instance;
    this.connection = connection;
  }

  _clone(cloneMap?: CloneMap): InstanceEndPoint {
    return new InstanceEndPoint(cloneMap.get(this.instance) as Particle, this.connection);
  }

  _compareTo(other: InstanceEndPoint): number {
    let cmp: number;
    if ((cmp = compareComparables(this.instance, other.instance)) !== 0) return cmp;
    if ((cmp = compareStrings(this.connection, other.connection)) !== 0) return cmp;
    return 0;
  }

  toString(nameMap: ReadonlyMap<RecipeComponent, string>): string {
    if (!this.connection) {
      return `${nameMap.get(this.instance)}`;
    }
    return `${nameMap.get(this.instance)}.${this.connection}`;
  }
}

export class HandleEndPoint extends EndPoint implements PublicHandleEndPoint {
  readonly handle: Handle;

  constructor(handle: Handle) {
    super();
    this.handle = handle;
  }

  _clone(cloneMap: CloneMap  = undefined): HandleEndPoint {
    return new HandleEndPoint(this.handle);
  }

  _compareTo(other: HandleEndPoint): number {
    let cmp: number;
    if ((cmp = compareStrings(this.handle.localName, other.handle.localName)) !== 0) return cmp;
    return 0;
  }

  toString(nameMap: ReadonlyMap<RecipeComponent, string> = undefined): string {
    return `${this.handle.localName}`;
  }
}

export class TagEndPoint extends EndPoint implements PublicTagEndPoint {
  readonly tags: string[];
  constructor(tags: string[]) {
    super();
    this.tags = tags;
  }

  _clone(cloneMap: CloneMap = undefined): TagEndPoint {
    return new TagEndPoint(this.tags);
  }

  _compareTo(other: TagEndPoint): number {
    let cmp: number;
    if ((cmp = compareArrays(this.tags, other.tags, compareStrings)) !== 0) return cmp;
    return 0;
  }

  // TODO: nameMap is not used. Remove it?
  toString(nameMap: ReadonlyMap<RecipeComponent, string> = undefined): string {
    return this.tags.map(a => `#${a}`).join(' ');
  }
}

//type EndPoint = ParticleEndPoint | InstanceEndPoint | HandleEndPoint | TagEndPoint;

export class ConnectionConstraint implements Comparable<ConnectionConstraint> {
  from: EndPoint;
  to: EndPoint;
  direction: Direction;
  relaxed: boolean;
  type: 'constraint' | 'obligation';

  constructor(fromConnection: EndPoint, toConnection: EndPoint, direction: Direction, relaxed: boolean, type: 'constraint' | 'obligation') {
    assert(direction);
    assert(type);
    this.from = fromConnection;
    this.to = toConnection;
    this.direction = direction;
    this.relaxed = relaxed;
    this.type = type;
    Object.freeze(this);
  }

  _copyInto(recipe: Recipe, cloneMap: CloneMap) {
    if (this.type === 'constraint') {
      if (this.from instanceof InstanceEndPoint || this.to instanceof InstanceEndPoint) {
        assert(false, `Can't have connection constraints of type constraint with InstanceEndPoints`);
      } else {
        return recipe.newConnectionConstraint(
            this.from._clone(), this.to._clone(), this.direction, this.relaxed);
      }
    }

    return recipe.newObligation(this.from._clone(cloneMap), this.to._clone(cloneMap), this.direction, this.relaxed);
  }

  _compareTo(other: ConnectionConstraint): number {
    let cmp: number;
    if ((cmp = this.from._compareTo(other.from)) !== 0) return cmp;
    if ((cmp = this.to._compareTo(other.to)) !== 0) return cmp;
    if ((cmp = compareStrings(this.direction, other.direction)) !== 0) return cmp;
    if ((cmp = compareBools(this.relaxed, other.relaxed)) !== 0) return cmp;
    return 0;
  }

  toString(nameMap?: ReadonlyMap<RecipeComponent, string>, options?: ToStringOptions): string {
    const subresults = [
      `${this.from.toString(nameMap)}:`,
      this.direction !== 'any' ? this.direction : '',
      this.relaxed ? RELAXATION_KEYWORD : '',
      this.to.toString(nameMap)
    ];
    if (options && options.showUnresolved === true && this.type === 'obligation') {
      subresults.push('// unresolved obligation');
    }
    return subresults.filter(s => s !== '').join(' ');
  }
}
