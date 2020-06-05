/**
 * @license
 * Copyright (c) 2020 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../platform/assert-web.js';
import {AnnotationRef} from './recipe/annotation.js';

export enum CapabilityComparison {
  LessStrict, Equivalent, Stricter
}

// Base class for all store capabilities.
export abstract class Capability {
  isEquivalent(other: Capability): boolean {
    const comparison = this.compare(other);
    return comparison === CapabilityComparison.Equivalent;
  }
  isLessStrict(other: Capability): boolean {
    return this.compare(other) === CapabilityComparison.LessStrict;
  }

  isSameOrLessStrict(other: Capability): boolean {
    return [CapabilityComparison.LessStrict, CapabilityComparison.Equivalent]
        .includes(this.compare(other));
  }

  isStricter(other: Capability): boolean {
    return this.compare(other) === CapabilityComparison.Stricter;
  }

  isSameOrStricter(other: Capability): boolean {
    return [CapabilityComparison.Stricter, CapabilityComparison.Equivalent]
        .includes(this.compare(other));
  }
  abstract compare(other: Capability): CapabilityComparison;

  abstract setMostRestrictive(other: Capability): boolean;
  abstract setLeastRestrictive(other: Capability): boolean;

  static fromAnnotations(annotations: AnnotationRef[]): Capability {
    throw new Error('not implemented');
  }
}

// The persistence types in order from most to least restrictive.
export enum PersistenceType {
  None = 0, InMemory, OnDisk, Unrestricted
}

export class Persistence extends Capability {
  public type: PersistenceType;

  constructor(type: PersistenceType = PersistenceType.None) {
    super();
    this.type = type;
  }

  static fromAnnotations(annotations: AnnotationRef[]): Capability {
    const types = new Set<PersistenceType>();
    for (const annotation of annotations) {
      if (['persistent', 'onDisk'].includes(annotation.name)) {
        types.add(PersistenceType.OnDisk);
      }
      if (['inMemory', 'tiedToArc', 'tiedToRuntime'].includes(annotation.name)) {
        types.add(PersistenceType.InMemory);
      }
    }
    if (types.size === 0) {
      return Persistence.unrestricted();
    }

    assert(types.size === 1,
        `Containing multiple persistence capabilities: ${annotations.map(
              a => a.toString()).join(' ')}`);
    return new Persistence([...types][0]);
  }

  setMostRestrictive(other: Capability): boolean {
    if (this.compare(other) === CapabilityComparison.LessStrict) {
      this.type = (other as Persistence).type;
    }
    return true;
  }

  setLeastRestrictive(other: Capability): boolean {
    if (this.compare(other) === CapabilityComparison.Stricter) {
      this.type = (other as Persistence).type;
    }
    return true;
  }

  compare(other: Capability): CapabilityComparison {
    assert(other instanceof Persistence);

    const otherPersistence = other as Persistence;
    if (this.type === otherPersistence.type) {
      return CapabilityComparison.Equivalent;
    }
    if (this.type < otherPersistence.type) {
      return CapabilityComparison.Stricter;
    }
    return CapabilityComparison.LessStrict;
  }

  static none(): Persistence { return new Persistence(PersistenceType.None); }
  static inMemory(): Persistence { return new Persistence(PersistenceType.InMemory); }
  static onDisk(): Persistence { return new Persistence(PersistenceType.OnDisk); }
  static unrestricted(): Persistence { return new Persistence(PersistenceType.Unrestricted); }
}

// TODO(b/157761106): use full names (minutes, hours, days) to be compatible
// with the policies language.
export enum TtlUnits {
  Millis = 'ms',
  Minutes = 'm',
  Hours = 'h',
  Days = 'd',
  Infinite = 'infinite'
}

// TTL as Capability.
// TODO(b/157761106): deprecate ttl.ts
export class Ttl extends Capability {
  private _count: number;
  private _units: TtlUnits;

  private constructor(count: number = 0, units: TtlUnits = TtlUnits.Millis) {
    super();
    this._count = count;
    this._units = units;
  }
  get count(): number { return this._count; }
  get units(): TtlUnits { return this._units; }

  get millis(): number {
    if (this.isInfinite) return null;
    switch (this.units) {
      case TtlUnits.Millis:
        return this.count;
      case TtlUnits.Minutes:
        return this.count * 60 * 1000;
      case TtlUnits.Hours:
        return this.count * 60 * 60 * 1000;
      case TtlUnits.Days:
        return this.count * 24 * 60 * 60 * 1000;
      default:
        throw new Error(`Unsupported ttl units ${this.units}`);
    }
  }

  calculateExpiration(start: Date = new Date()): Date {
    if (this.isInfinite) return null;
    return new Date(start.getTime() + this.millis);
  }

  get isInfinite(): boolean { return this.units === TtlUnits.Infinite; }

  compare(other: Capability): CapabilityComparison {
    assert(other instanceof Ttl);
    const otherTtl = other as Ttl;
    if (this.isInfinite || otherTtl.isInfinite) {
      return this.isInfinite === otherTtl.isInfinite
          ? CapabilityComparison.Equivalent : this.isInfinite
            ? CapabilityComparison.LessStrict : CapabilityComparison.Stricter;
    }
    const millis = this.millis;
    const otherMillis = otherTtl.millis;
    return (millis === otherMillis)
        ? CapabilityComparison.Equivalent : (millis >= otherMillis)
            ? CapabilityComparison.LessStrict : CapabilityComparison.Stricter;
  }

  setMostRestrictive(other: Capability): boolean {
    if (this.compare(other) === CapabilityComparison.LessStrict) {
      const otherTtl = other as Ttl;
      this._count = otherTtl.count;
      this._units = otherTtl.units;
    }
    return true;
  }

  setLeastRestrictive(other: Capability): boolean {
    if (this.compare(other) === CapabilityComparison.Stricter) {
      const otherTtl = other as Ttl;
      this._count = otherTtl.count;
      this._units = otherTtl.units;
    }
    return true;
  }

  static fromAnnotations(annotations: AnnotationRef[]): Capability {
    const ttlAnnotations = annotations.filter(annotation => annotation.name === 'ttl');
    assert(ttlAnnotations.length <= 1, `Containing multiple TTL annotations`);
    if (ttlAnnotations.length === 0) {
      return Ttl.infinite();
    }
    const annotation = ttlAnnotations[0];
    return Ttl.fromString(annotation.params['value'].toString());
  }

  public static fromString(ttlStr: string): Ttl {
    if (!ttlStr) {
      return Ttl.infinite();
    }
    const ttlTokens = ttlStr.match(/([0-9]+)([d|h|m])/);
    assert(ttlTokens && ttlTokens.length === 3, `Invalid ttl: ${ttlStr}`);
    return new Ttl(Number(ttlTokens[1]), Ttl.ttlUnitsFromString(ttlTokens[2]));
  }

  public static ttlUnitsFromString(units: string): TtlUnits {
    switch (units) {
      case 'm': return TtlUnits.Minutes;
      case 'h': return TtlUnits.Hours;
      case 'd': return TtlUnits.Days;
      default:
        throw new Error(`Unsupported ttl units ${units}`);
    }
  }

  static infinite(): Ttl { return new Ttl(null, TtlUnits.Infinite); }
  static minutes(count: number): Ttl { return new Ttl(count, TtlUnits.Minutes); }
  static hours(count: number): Ttl { return new Ttl(count, TtlUnits.Hours); }
  static days(count: number): Ttl { return new Ttl(count, TtlUnits.Days); }
}

export abstract class BooleanCapability extends Capability {
  public value: boolean;

  constructor(value: boolean = false) {
    super();
    this.value = value;
  }

  setMostRestrictive(other: Capability): boolean {
    if (this.compare(other) === CapabilityComparison.LessStrict) {
      this.value = (other as BooleanCapability).value;
    }
    return true;
  }

  setLeastRestrictive(other: Capability): boolean {
    if (this.compare(other) === CapabilityComparison.Stricter) {
      this.value = (other as BooleanCapability).value;
    }
    return true;
  }

  compare(other: Capability): CapabilityComparison {
    assert(other instanceof BooleanCapability);
    const otherCapability = other as BooleanCapability;
    if (this.value === otherCapability.value) {
      return CapabilityComparison.Equivalent;
    }
    return this.value ? CapabilityComparison.Stricter : CapabilityComparison.LessStrict;
  }
}

export class Queryable extends BooleanCapability {
  constructor(isQueryable: boolean) { super(isQueryable); }

  static fromAnnotations(annotations: AnnotationRef[]): Capability {
    const queryableAnnotations =
        annotations.filter(annotation => annotation.name === 'queryable');
    assert(queryableAnnotations.length <= 1, `Containing multiple queryable annotations`);
    return new Queryable(queryableAnnotations.length > 0);
  }
}

export class Encryption extends BooleanCapability {
  constructor(isEncrypted: boolean) { super(isEncrypted); }

  static fromAnnotations(annotations: AnnotationRef[]): Capability {
    const encryptedAnnotations =
        annotations.filter(annotation => annotation.name === 'encrypted');
    assert(encryptedAnnotations.length <= 1, `Containing multiple encrypted annotations`);
    return new Encryption(encryptedAnnotations.length > 0);
  }
}

// Capabilities are a grouping of individual capabilities.
export class Capabilities extends Capability {
  readonly list: Capability[];
  constructor(list: Capability[] = []) {
    super();
    this.list = list;
  }

  static fromAnnotations(annotations: AnnotationRef[]): Capabilities {
    const list: Capability[] = [];
    for (const capabilityType of Capabilities.all) {
      list.push(capabilityType.fromAnnotations(annotations));
    }
    return new Capabilities(list);
  }

  getPersistence(): Persistence|null {
    const persistence = this.list.find(capability => capability instanceof Persistence);
    return persistence ? persistence as Persistence : null;
  }

  getTtl(): Ttl|null {
    const ttl = this.list.find(capability => capability instanceof Ttl);
    return ttl ? ttl as Ttl : null;
  }

  isEncrypted(): boolean {
    const encryption = this.list.find(capability => capability instanceof Encryption);
    return encryption ? (encryption as Encryption).value : false;
  }

  isQueryable(): boolean {
    const queryable = this.list.find(capability => capability instanceof Queryable);
    return queryable ? (queryable as Queryable).value : false;
  }

  compare(other: Capability): CapabilityComparison {
    assert(other instanceof Capabilities);
    const otherCapabilities = other as Capabilities;
    assert(this.list.length === otherCapabilities.list.length);
    for (let index = 0; index < this.list.length; ++index) {
      const capability = this.list[index];
      const otherCapability = otherCapabilities.list[index];
      const comparison = capability.compare(otherCapability);
      if (comparison !== CapabilityComparison.Equivalent) {
        return comparison;
      }
    }
    return CapabilityComparison.Equivalent;
  }

  // Returns true, if all capabilities in one sets are consistently equivalent
  // or stricter than the other.
  protected canRestrict(other: Capabilities): boolean {
    assert(this.list.length === other.list.length);
    let totalComparison = CapabilityComparison.Equivalent;
    for (let index = 0; index < this.list.length; ++index) {
      const capability = this.list[index];
      const otherCapability = other.list[index];
      const comparison = capability.compare(otherCapability);
      if (comparison !== CapabilityComparison.Equivalent) {
        if (totalComparison !== CapabilityComparison.Equivalent &&
            totalComparison !== comparison) {
            return false;
        }
        totalComparison = comparison;
      }
    }
    return true;
  }

  setMostRestrictive(other: Capability): boolean {
    assert(other instanceof Capabilities);
    const otherCapabilities = other as Capabilities;
    if (!this.canRestrict(otherCapabilities)) {
      return false;
    }
    for (let index = 0; index < this.list.length; ++index) {
      this.list[index].setMostRestrictive(otherCapabilities.list[index]);
    }
    return true;
  }

  setLeastRestrictive(other: Capability): boolean {
    assert(other instanceof Capabilities);
    const otherCapabilities = other as Capabilities;
    if (!this.canRestrict(otherCapabilities)) {
      return false;
    }
    for (let index = 0; index < this.list.length; ++index) {
      this.list[index].setLeastRestrictive(otherCapabilities.list[index]);
    }
    return true;
  }

  // List of individual Capabilities in the order of enforcement.
  static readonly all: (typeof Capability | typeof BooleanCapability)[] = [
    Persistence,
    Encryption,
    Ttl,
    Queryable
  ];
}
