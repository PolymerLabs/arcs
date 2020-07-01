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
import {Literal} from './hot.js';

export enum CapabilityComparison {
  LessStrict, Equivalent, Stricter
}

export type CapabilityTag =
    'persistence' | 'ttl' | 'encryption' | 'queryable' | 'shareable' | 'range';

// Base class for all store capabilities.
export abstract class Capability {
  readonly tag: CapabilityTag;

  protected constructor(tag: CapabilityTag) {
    this.tag = tag;
  }

  isEquivalent(other: Capability): boolean {
    return this.compare(other) === CapabilityComparison.Equivalent;
  }

  contains(other: Capability): boolean {
    return this.isEquivalent(other);
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

  static fromAnnotations(annotations: AnnotationRef[] = []): Capability {
    throw new Error('not implemented');
  }

  abstract compare(other: Capability): CapabilityComparison;

  abstract setMostRestrictive(other: Capability): boolean;
  abstract setLeastRestrictive(other: Capability): boolean;

  isCompatible(other: Capability): boolean {
    return this.tag === other.tag;
  }

  toRange(): CapabilityRange { return new CapabilityRange(this, this); }

  abstract toDebugString(): string;
}

// The persistence kinds in order from most to least restrictive.
export enum PersistenceKind {
  None = 'none', InMemory = 'inMemory', OnDisk = 'onDisk', Unrestricted = 'unrestricted'
}

export class Persistence extends Capability {
  static readonly tag: CapabilityTag = 'persistence';
  public kind: PersistenceKind;

  constructor(kind: PersistenceKind = PersistenceKind.None) {
    super(Persistence.tag);
    this.kind = kind;
  }

  static fromAnnotations(annotations: AnnotationRef[] = []): Capability {
    const kinds = new Set<PersistenceKind>();
    for (const annotation of annotations) {
      if ([PersistenceKind.OnDisk, 'persistent'].includes(annotation.name)) {
        kinds.add(PersistenceKind.OnDisk);
      }
      if ([PersistenceKind.InMemory, 'tiedToArc', 'tiedToRuntime'].includes(annotation.name)) {
        kinds.add(PersistenceKind.InMemory);
      }
    }
    if (kinds.size === 0) {
      return null;
    }

    assert(kinds.size === 1,
        `Containing multiple persistence capabilities: ${annotations.map(
              a => a.toString()).join(' ')}`);
    return new Persistence([...kinds][0]);
  }

  setMostRestrictive(other: Capability): boolean {
    if (this.compare(other) === CapabilityComparison.LessStrict) {
      this.kind = (other as Persistence).kind;
    }
    return true;
  }

  setLeastRestrictive(other: Capability): boolean {
    if (this.compare(other) === CapabilityComparison.Stricter) {
      this.kind = (other as Persistence).kind;
    }
    return true;
  }

  compare(other: Capability): CapabilityComparison {
    assert(this.isCompatible(other));
    const otherPersistence = other as Persistence;
    if (this.kind === otherPersistence.kind) {
      return CapabilityComparison.Equivalent;
    }
    if (Object.values(PersistenceKind).indexOf(this.kind) <
        Object.values(PersistenceKind).indexOf(otherPersistence.kind)) {
      return CapabilityComparison.Stricter;
    }
    return CapabilityComparison.LessStrict;
  }

  toDebugString(): string { return this.kind.toString(); }

  static none(): Persistence { return new Persistence(PersistenceKind.None); }
  static inMemory(): Persistence { return new Persistence(PersistenceKind.InMemory); }
  static onDisk(): Persistence { return new Persistence(PersistenceKind.OnDisk); }
  static unrestricted(): Persistence { return new Persistence(PersistenceKind.Unrestricted); }

  static any(): Capability { return new CapabilityRange(Persistence.unrestricted(), Persistence.none()); }
}

export enum TtlUnits {
  Millis = 'ms',
  Minutes = 'm',
  Hours = 'h',
  Days = 'd',
  Infinite = 'infinite'
}

export interface TtlLiteral extends Literal {
  count: number;
  units: TtlUnits;
}

// TTL as Capability.
export class Ttl extends Capability {
  static readonly tag: CapabilityTag = 'ttl';
  private _count: number;
  private _units: TtlUnits;

  private constructor(count: number = 0, units: TtlUnits = TtlUnits.Millis) {
    super(Ttl.tag);
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
    assert(this.isCompatible(other));
    const otherTtl = other as Ttl;
    if (this.isInfinite || otherTtl.isInfinite) {
      return this.isInfinite === otherTtl.isInfinite
          ? CapabilityComparison.Equivalent : this.isInfinite
            ? CapabilityComparison.LessStrict : CapabilityComparison.Stricter;
    }
    const millis = this.millis;
    const otherMillis = otherTtl.millis;
    return (millis === otherMillis)
        ? CapabilityComparison.Equivalent : (millis > otherMillis)
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

  static fromAnnotations(annotations: AnnotationRef[] = []): Capability {
    const ttlAnnotations = annotations.filter(annotation => annotation.name === 'ttl');
    if (ttlAnnotations.length === 0) {
      return null;
    }
    assert(ttlAnnotations.length === 1, `Containing multiple TTL annotations`);
    const annotation = ttlAnnotations[0];
    return Ttl.fromString(annotation.params['value'].toString());
  }

  public static fromString(ttlStr: string): Ttl {
    if (!ttlStr) {
      return Ttl.infinite();
    }
    const ttlTokens = ttlStr.match(/([0-9]+)[ ]*(day[s]?|hour[s]?|minute[s]?|[d|h|m])$/);
    assert(ttlTokens && ttlTokens.length === 3, `Invalid ttl: ${ttlStr}`);
    return new Ttl(Number(ttlTokens[1]), Ttl.ttlUnitsFromString(ttlTokens[2]));
  }

  static fromLiteral(data: TtlLiteral): Ttl {
    if (data.units === TtlUnits.Infinite) {
      return Ttl.infinite();
    }
    return new Ttl(data.count, data.units);
  }

  toLiteral(): TtlLiteral {
    return {count: this.count, units: this.units};
  }

  public static ttlUnitsFromString(units: string): TtlUnits {
    if ([TtlUnits.Minutes, 'minutes', 'minute'].includes(units)) {
      return TtlUnits.Minutes;
    }
    if ([TtlUnits.Hours, 'hours', 'hour'].includes(units)) {
      return TtlUnits.Hours;
    }
    if ([TtlUnits.Days, 'days', 'days'].includes(units)) {
      return TtlUnits.Days;
    }
    throw new Error(`Unsupported ttl units ${units}`);
  }

  toDebugString(): string {
    return this.isInfinite ? `infinite` : `${this.count}${this.units}`;
  }

  static infinite(): Ttl { return new Ttl(null, TtlUnits.Infinite); }
  static minutes(count: number): Ttl { return new Ttl(count, TtlUnits.Minutes); }
  static hours(count: number): Ttl { return new Ttl(count, TtlUnits.Hours); }
  static days(count: number): Ttl { return new Ttl(count, TtlUnits.Days); }
  static zero(): Ttl { return new Ttl(0, TtlUnits.Millis); }

  static any(): Capability { return new CapabilityRange(Ttl.infinite(), Ttl.zero()); }
}

export abstract class BooleanCapability extends Capability {
  public value: boolean;

  constructor(tag: CapabilityTag, value: boolean = false) {
    super(tag);
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
    assert(this.isCompatible(other));
    const otherCapability = other as BooleanCapability;
    if (this.value === otherCapability.value) {
      return CapabilityComparison.Equivalent;
    }
    return this.value ? CapabilityComparison.Stricter : CapabilityComparison.LessStrict;
  }
}

export class Queryable extends BooleanCapability {
  static readonly tag: CapabilityTag = 'queryable';

  constructor(value: boolean = false) {
    super(Queryable.tag, value);
  }

  static fromAnnotations(annotations: AnnotationRef[] = []): Capability {
    const queryableAnnotations =
        annotations.filter(annotation => annotation.name === 'queryable');
    if (queryableAnnotations.length === 0) {
      return null;
    }
    assert(queryableAnnotations.length === 1, `Containing multiple queryable annotations`);
    return new Queryable(true);
  }

  toDebugString(): string {
    return this.value ? 'queryable' : 'notQueryable';
  }

  static any(): Capability { return new CapabilityRange(new Queryable(false), new Queryable(true)); }
}

// This is an inferred only capabilities that used to distinguish between
// ramdisk and volatile memory. Currently only introduced for backward
// compatibility in tests.
export class Shareable extends BooleanCapability {
  static readonly tag: CapabilityTag = 'shareable';

  constructor(value: boolean = false) {
    super(Shareable.tag, value);
  }

  static fromAnnotations(annotations: AnnotationRef[] = []): Capability {
    const shareableAnnotations =
        annotations.filter(annotation => ['shareable', 'tiedToRuntime'].includes(annotation.name));
    if (shareableAnnotations.length === 0) {
      return null;
    }
    assert(shareableAnnotations.length === 1, `Containing multiple queryable annotations`);
    return new Shareable(true);
  }

  toDebugString(): string {
    return this.value ? 'shareable' : 'notShareable';
  }

  static any(): Capability { return new CapabilityRange(new Shareable(false), new Shareable(true)); }
}

export class Encryption extends BooleanCapability {
  static readonly tag: CapabilityTag = 'encryption';

  constructor(value: boolean = false) {
    super(Encryption.tag, value);
  }

  static fromAnnotations(annotations: AnnotationRef[] = []): Capability {
    const encryptedAnnotations =
        annotations.filter(annotation => annotation.name === 'encrypted');
    if (encryptedAnnotations.length === 0) {
      return null;
    }
    assert(encryptedAnnotations.length === 1, `Containing multiple encrypted annotations`);
    return new Encryption(true);
  }

  toDebugString(): string {
    return this.value ? 'encrypted' : 'notEncrypted';
  }

  static any(): Capability { return new CapabilityRange(new Encryption(false), new Encryption(true)); }
}

export class CapabilityRange extends Capability {
  static readonly tag: CapabilityTag = 'range';
  min: Capability;
  max: Capability;

  constructor(min: Capability, max?: Capability) {
    super(CapabilityRange.tag);
    this.min = min;
    this.max = max || min;
    assert(this.min.isSameOrLessStrict(this.max));
  }

  isEquivalent(other: Capability): boolean {
    if (other.tag === CapabilityRange.tag) {
      const range = other as CapabilityRange;
      return this.min.isEquivalent(range.min) && this.max.isEquivalent(range.max);
    }
    return this.min.isEquivalent(other) && this.max.isEquivalent(other);
  }

  isCompatible(other: Capability): boolean {
    if (other.tag === CapabilityRange.tag) {
      return this.min.isCompatible((other as CapabilityRange).min);
    }
    return this.min.isCompatible(other);
  }

  contains(other: Capability): boolean {
    if (other.tag === CapabilityRange.tag) {
      const range = other as CapabilityRange;
      return this.min.isSameOrLessStrict(range.min) && this.max.isSameOrStricter(range.max);
    }
    return this.min.isSameOrLessStrict(other) && this.max.isSameOrStricter(other);
  }

  compare(other: Capability): CapabilityComparison {
    throw new Error('not supported');
  }

  setMostRestrictive(other: Capability): boolean {
    throw new Error('not supported');
  }

  setLeastRestrictive(other: Capability): boolean {
    throw new Error('not supported');
  }

  toRange(): CapabilityRange { return this; }

  toDebugString(): string {
    if (this.min.isEquivalent(this.max)) {
      return this.min.toDebugString();
    }
    return `${this.min.toDebugString()} - ${this.max.toDebugString()}`;
  }
}

// Capabilities are a grouping of individual capabilities.
export class Capabilities {
  private readonly ranges: CapabilityRange[] = [];
  private constructor(ranges: Capability[] = []) {
    for (const capability of ranges) {
      this.ranges.push(capability.toRange());
    }
  }

  static create(ranges: Capability[] = []) {
    return new Capabilities(ranges);
  }

  getPersistence(): Persistence|undefined {
    const range = this.getWithTag(Persistence.tag);
    if (range) {
      assert(range.min.isEquivalent(range.max));
      return range.min as Persistence;
    }
    return undefined;
  }

  getTtl(): Ttl|undefined {
    const range = this.getWithTag(Ttl.tag);
    if (range) {
      assert(range.min.isEquivalent(range.max));
      return range.min as Ttl;
    }
    return undefined;
  }

  isEncrypted(): boolean|undefined {
    const encryption = this.getWithTag(Encryption.tag);
    return encryption ? (encryption.min as Encryption).value : undefined;
  }

  isQueryable(): boolean|undefined {
    const queryable = this.getWithTag(Queryable.tag);
    return queryable ? (queryable.min as Queryable).value : undefined;
  }

  isShareable(): boolean|undefined {
    const shareable = this.getWithTag(Shareable.tag);
    return shareable ? (shareable.min as Shareable).value : undefined;
  }

  private getWithTag(tag: CapabilityTag): CapabilityRange|undefined {
    return this.ranges.find(range => range.min.tag === tag);
  }

  static fromAnnotations(annotations: AnnotationRef[] = []): Capabilities {
    const ranges: Capability[] = [];
    for (const parser of [Persistence.fromAnnotations,
        Encryption.fromAnnotations,
        Ttl.fromAnnotations,
        Queryable.fromAnnotations,
        Shareable.fromAnnotations])  {
      const capability = parser(annotations);
      if (capability) {
        ranges.push(capability);
      }
    }
    return new Capabilities(ranges);
  }

  setCapability(capability: Capability): boolean {
    let existing = this.getWithTag(capability.tag);
    if (existing) {
      existing = capability.toRange();
    } else {
      this.ranges.push(capability.toRange());
    }
    return true;
  }

  isEmpty() { return this.ranges.length === 0; }

  isEquivalent(other: Capabilities): boolean {
    return this.ranges.length === other.ranges.length &&
           other.ranges.every(otherRange => this.hasEquivalent(otherRange));
  }

  hasEquivalent(capability: Capability): boolean {
    return this.ranges.some(range => {
      return range.isCompatible(capability) && range.isEquivalent(capability);
    });
  }

  contains(capability: Capability): boolean {
    return this.ranges.some(range => {
      return range.isCompatible(capability) && range.contains(capability);
    });
  }

  containsAll(other: Capabilities): boolean {
    return other.ranges.every(otherRange => {
      const range = this.ranges.find(r => r.isCompatible(otherRange));
      return range && range.contains(otherRange);
    });
  }

  toDebugString(): string {
    return this.ranges.map(({min, max}) => min.isEquivalent(max)
        ? min.toDebugString() : `${min.toDebugString()} - ${max.toDebugString()}`
    ).join(' /// ');
  }
}
