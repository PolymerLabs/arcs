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

  private readonly _count: number;
  private readonly _units: TtlUnits;
  
  constructor(count: number, units: string) {
    this._count = count;
    switch (units) {
      case 'm':
        this._units = TtlUnits.Minute;
        break;
      case 'h':
        this._units = TtlUnits.Hour;
        break;
      case 'd':
        this._units = TtlUnits.Day;
        break;
      default:
        assert(`Invalid ttl units ${units}`);
    }
  }

  get count(): number { return this._count; }
  get units(): TtlUnits { return this._units; }

  public toString(): string {
    return `${this.count}${TtlUnits[this.units]}`;
  }
}

