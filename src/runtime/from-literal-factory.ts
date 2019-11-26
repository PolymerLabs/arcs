/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Schema} from './schema.js';
import {Type, TypeLiteral} from './type.js';

type TypeMethod = (literal: TypeLiteral) => Type;

export class FromLiteralFactory {

  private static typeMethod: TypeMethod;
  static setTypeMethod(meth: TypeMethod) {
    FromLiteralFactory.typeMethod = meth;
  }
  static typeFromLiteral(literal: TypeLiteral) {
    return FromLiteralFactory.typeMethod(literal);
  }
}
