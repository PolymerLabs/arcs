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
  Dom ='dom', DomTouch='dom-touch', Vr='vr', Voice='voice'
}

export class Modality {
  private constructor(public readonly names: string[]) {}

  static create(names: string[]) {
    assert(names.every(name => Modality.all.names.includes(name)), `Unsupported modality in: ${names}`);
    return new Modality(names);
  }

  intersection(other: Modality): Modality {
    return new Modality(this.names.filter(name => other.names.includes(name)));
  }

  isResolved(): boolean {
    return this.names.length > 0;
  }

  isCompatible(names: string[]): boolean {
    return this.intersection(Modality.create(names)).isResolved();
  }

  static get Name() { return ModalityName; }
  static readonly all = new Modality([
    Modality.Name.Dom, Modality.Name.DomTouch, Modality.Name.Vr, Modality.Name.Voice
  ]);
  static readonly dom = new Modality([Modality.Name.Dom]);
  static readonly domTouch = new Modality([Modality.Name.DomTouch]);
  static readonly voice = new Modality([Modality.Name.Voice]);
  static readonly vr = new Modality([Modality.Name.Vr]);
}
