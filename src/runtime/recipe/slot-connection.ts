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

import {Particle} from './particle.js';
import {CloneMap, IsValidOptions, Recipe, RecipeComponent, ToStringOptions} from './recipe.js';
import {Slot} from './slot.js';
import {compareComparables, compareStrings, Comparable} from './comparable.js';
import {Dictionary} from '../hot.js';
import {ConsumeSlotConnectionSpec} from '../particle-spec.js';

import {Flags} from '../flags.js';
import {isRequireSection} from './util.js';

export class SlotConnection implements Comparable<SlotConnection> {
  private readonly _recipe: Recipe;
  private readonly _particle: Particle;
  private readonly _name: string;
  private _targetSlot?: Slot = undefined;
  private _providedSlots: Dictionary<Slot> = {};
  private _tags: string[] = [];

  constructor(name: string, particle: Particle) {
    assert(particle);
    assert(particle.recipe);
    assert(name);

    this._recipe = particle.recipe;
    this._particle = particle;
    this._name = name;
  }

  remove(): void {
    this._particle.removeSlotConnection(this);
  }

  get recipe(): Recipe { return this._recipe; }
  get particle(): Particle  { return this._particle; }
  get name(): string { return this._name; }
  getQualifiedName(): string { return `${this.particle.name}::${this.name}`; }
  get targetSlot(): Slot|undefined { return this._targetSlot; }
  set targetSlot(targetSlot: Slot | undefined) { this._targetSlot = targetSlot; }

  get providedSlots(): Dictionary<Slot> { return this._providedSlots; }
  get tags(): string[] { return this._tags; }
  set tags(tags: string[]) { this._tags = tags; }

  getSlotSpec(): ConsumeSlotConnectionSpec|undefined {
    return this.particle.spec && this.particle.spec.getSlandleSpec(this.name);
  }

  connectToSlot(targetSlot: Slot): void {
    assert(targetSlot);
    assert(!this.targetSlot);
    assert(isRequireSection(this.recipe) || this.recipe === targetSlot.recipe, 'Cannot connect to slot from different recipe');

    this._targetSlot = targetSlot;
    targetSlot.consumeConnections.push(this);
  }

  disconnectFromSlot(): void {
    if (this._targetSlot) {
      this._targetSlot.removeConsumeConnection(this);
      this._targetSlot = undefined;
    }
  }

  _clone(particle: Particle, cloneMap: CloneMap): SlotConnection {
    if (cloneMap.has(this)) {
      return cloneMap.get(this) as SlotConnection;
    }

    const slotConnection = particle.addSlotConnectionAsCopy(this.name);
    slotConnection.tags = this.tags;

    cloneMap.set(this, slotConnection);
    return slotConnection;
  }

  _normalize(): void {
    const normalizedSlots = {};
    for (const key of (Object.keys(this._providedSlots).sort())) {
      normalizedSlots[key] = this._providedSlots[key];
    }
    this._providedSlots = normalizedSlots;
    Object.freeze(this);
  }

  _compareTo(other: SlotConnection): number {
    let cmp: number;
    if ((cmp = compareStrings(this.name, other.name)) !== 0) return cmp;
    if ((cmp = compareComparables(this._targetSlot, other._targetSlot)) !== 0) return cmp;
    if ((cmp = compareComparables(this._particle, other._particle)) !== 0) return cmp;
    return 0;
  }

  _isValid(options: IsValidOptions): boolean {
    if (this._targetSlot && this._targetSlot.sourceConnection &&
        this._targetSlot !== this._targetSlot.sourceConnection.providedSlots[this._targetSlot.name]) {
      if (options && options.errors) {
        options.errors.set(this, `Invalid target slot '${this._targetSlot.name}' for slot connection '${this.name}' of particle ${this.particle.name}`);
      }
      return false;
    }

    // TODO: add more checks.
    return true;
  }

  isResolved(options?): boolean {
    const error = (label: string) => {
      if (options && options.errors) {
        options.errors.set(this.name, label);
      }
      if (options && options.details) {
        options.details = label; // TODO(jopra): use .errors instead.
      }
    };
    assert(Object.isFrozen(this), `slot connection ${this.name} must be frozen before it is resolved`);

    if (!this.name) {
      error('missing name');
      return false;
    }
    if (!this.particle) {
      error('missing particle');
      return false;
    }

    const slotSpec = this.getSlotSpec();

    if (slotSpec === undefined || slotSpec.isRequired) {
      if (!this.targetSlot) {
        // The required connection has no target slot
        error(`missing target-slot`);
        return false;
      }
      if (!this.targetSlot.id && !(this.targetSlot.sourceConnection && this.targetSlot.sourceConnection.isConnected())) {
        // The required connection's target slot is not resolved (has no ID or source connection).
        error(`unresolved target-slot`);
        return false;
      }
    }
    if (!this.targetSlot) {
      return true;
    }

    if (slotSpec === undefined) return true;

    return this.getSlotSpec().provideSlotConnections.every(providedSlot => {
      if (providedSlot && providedSlot.isRequired && this.providedSlots[providedSlot.name].consumeConnections.length === 0) {
        error('missing consuming slot');
        return false;
      }
      return true;
    });
  }

  isConnectedToInternalSlot(): boolean {
    return this.targetSlot && (!!this.targetSlot.sourceConnection);
  }
  isConnectedToRemoteSlot(): boolean {
    return this.targetSlot && (!!this.targetSlot.id);
  }

  isConnected(): boolean {
    return this.isConnectedToInternalSlot() || this.isConnectedToRemoteSlot();
  }

  toString(nameMap: Map<RecipeComponent, string>, options: ToStringOptions): string {
    const consumeRes: string[] = [];
    consumeRes.push(`${this.name}:`);
    consumeRes.push('consumes');
    if (this.targetSlot) {
      consumeRes.push(
          (nameMap && nameMap.get(this.targetSlot)) ||
          this.targetSlot.localName);
    }

    if (options && options.showUnresolved) {
      if (!this.isResolved(options)) {
        consumeRes.push(`// unresolved slot-connection: ${options.details}`);
      }
    }

    const result: string[] = [];
    result.push(consumeRes.join(' '));

    Object.keys(this.providedSlots).forEach(psName => {
      const providedSlot = this.providedSlots[psName];
      const provideRes: string[] = [];
      // Only assert that there's a spec for this provided slot if there's a spec for
      // the consumed slot .. otherwise this is just a constraint.
      if (this.getSlotSpec()) {
        const providedSlotSpec = this.particle.getSlotSpecByName(psName);
        assert(providedSlotSpec, `Cannot find providedSlotSpec for ${psName}`);
      }

      provideRes.push(`  ${psName}:`);
      provideRes.push('provides');
      provideRes.push(`${(nameMap && nameMap.get(providedSlot)) || providedSlot}`);

      result.push(provideRes.join(' '));
    });
    return result.join('\n');
  }
}
