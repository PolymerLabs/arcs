/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {assert} from '../../platform/assert-web.js';

enum ModalityName {
  Dom ='dom', DomTouch='domTouch', Vr='vr', Voice='voice'
}

export class Modality {
  // `all` true means modality is non restricted and any modality is compatible.
  // Otherwise, the `names` field in Modality contains the restrictive list of
  // modalities (an empty list stands for no suitable modalities being available).
  private constructor(public readonly all: boolean, public readonly names: string[] = []) {}

  static create(names: string[]) {
    assert(names != null);
    return new Modality(false, names);
  }

  intersection(other: Modality): Modality {
    if (this.all && other.all) {
      return new Modality(true, []);
    }
    if (this.all) {
      return new Modality(false, other.names);
    }
    return new Modality(false, this.names.filter(name => other.all || other.names.includes(name)));
  }

  static intersection(modalities: Modality[]): Modality {
    return modalities.reduce((modality, total) => modality.intersection(total), Modality.all);
  }

  union(other: Modality): Modality {
    if (this.all || other.all) {
      return Modality.all;
    }
    return new Modality(false, [...new Set<string>(this.names.concat(other.names))]);
  }

  static union(modalities: Modality[]): Modality {
    return modalities.length === 0
        ? Modality.all
        : modalities.reduce((modality, total) => modality.union(total), Modality.create([]));
  }

  isResolved(): boolean {
    return this.all || this.names.length > 0;
  }

  isCompatible(names: string[]): boolean {
    return this.intersection(Modality.create(names)).isResolved();
  }

  static get Name() { return ModalityName; }

  static readonly all = new Modality(true, []);
  static readonly dom = new Modality(false, [Modality.Name.Dom]);
  static readonly domTouch = new Modality(false, [Modality.Name.DomTouch]);
  static readonly voice = new Modality(false, [Modality.Name.Voice]);
  static readonly vr = new Modality(false, [Modality.Name.Vr]);
}
