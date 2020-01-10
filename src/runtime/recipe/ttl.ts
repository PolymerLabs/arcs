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

export enum TtlUnits {Minute = 'm', Hour = 'h', Day = 'd'}

export class Ttl {
  constructor(
      public readonly count: number,
      public readonly units: TtlUnits) {}

  public toString(): string {
    return `${this.count}${TtlUnits[this.units]}`;
  }

  public static fromString(ttlStr: string): Ttl {
    const ttlTokens = ttlStr.match(/([0-9]+)([d|h|m])/);
    assert(ttlTokens.length === 3, `Invalid ttl: ${ttlStr}`);
    return new Ttl(Number(ttlTokens[1]), Ttl.ttlUnitsFromString(ttlTokens[2]));
  }

  public static ttlUnitsFromString(units: string): TtlUnits|undefined {
    switch (units) {
      case 'm': return TtlUnits.Minute;
      case 'h': return TtlUnits.Hour;
      case 'd': return TtlUnits.Day;
      default:
        assert(`Unsupported ttl units ${units}`);
        return undefined;
    }
  }

  calculateExpiration(start: Date = new Date()): Date {
    let ttlMillis = 1;
    switch (this.units) {
      case TtlUnits.Minute:
        ttlMillis = this.count * 60 * 1000;
        break;
      case TtlUnits.Hour:
        ttlMillis = this.count * 60 * 60 * 1000;
        break;
      case TtlUnits.Day:
        ttlMillis = this.count * 24 * 60 * 60 * 1000;
        break;
      default:
        assert(false);
    }
    return new Date(start.getTime() + ttlMillis);
  }
}

