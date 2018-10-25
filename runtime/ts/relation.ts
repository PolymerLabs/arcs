// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import {Entity} from './entity.js';
import {Type} from './type.js';
import {Symbols} from './symbols.js';

// TODO: Should relations normalized by another layer, or here?
export class Relation extends Entity {
  entities: Entity[];

  constructor(...entities) {
    super();
    this.entities = entities;
  }

  get data() {
    return this.entities.map(entity => entity[Symbols.identifier].toLiteral());
  }

  static typeFor(relation) {
    const result = new Type(relation.entities.map(entity => entity.constructor.type), relation.constructor);
    return result;
  }
}
