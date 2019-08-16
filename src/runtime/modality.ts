/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {assert} from '../platform/assert-web.js';

enum ModalityName {
  Dom ='dom', DomTouch='domTouch', Vr='vr', Voice='voice'
}

export class Modality {
  // The `names` field in Modality contains the restrictive list of modalities.
  // `null` stands for no restrictions at all.
  // empty list stands for no suitable modalities being available.
  private constructor(public readonly names: string[]) {}

  static create(names: string[]) {
    assert(names != null);
    return new Modality(names);
  }

  intersection(other: Modality): Modality {
    return new Modality(this.names
        ? this.names.filter(name => !other.names || other.names.includes(name))
        : other.names);
  }

  static intersection(modalities: Modality[]): Modality {
    const allNames = new Set<string>();
    for (const modality of modalities) {
      if (modality.names) {
        for (const name of modality.names) {
          allNames.add(name);
        }
      }
    }
    if (allNames.size === 0) {
      return Modality.all;
    }
    return modalities.reduce(
        (modality, total) => modality.intersection(total), Modality.create([...allNames]));
  }

  isResolved(): boolean {
    return !this.names || this.names.length > 0;
  }

  isCompatible(names: string[]): boolean {
    return this.intersection(Modality.create(names)).isResolved();
  }

  static get Name() { return ModalityName; }

  static readonly all = new Modality(null);

  static readonly dom = new Modality([Modality.Name.Dom]);
  static readonly domTouch = new Modality([Modality.Name.DomTouch]);
  static readonly voice = new Modality([Modality.Name.Voice]);
  static readonly vr = new Modality([Modality.Name.Vr]);
}
