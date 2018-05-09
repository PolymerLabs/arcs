/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Type} from './type.js';

export class TupleFields {
  constructor(fieldList) {
    this.fieldList = fieldList;
  }

  static fromLiteral(literal) {
    return new TupleFields(literal.map(a => Type.fromLiteral(a)));
  }

  toLiteral() {
    return this.fieldList.map(a => a.toLiteral());
  }

  clone() {
    return new TupleFields(this.fieldList.map(a => a.clone()));
  }

  equals(other) {
    if (this.fieldList.length !== other.fieldList.length)
      return false;
    for (let i = 0; i < this.fieldList.length; i++) {
      if (!this.fieldList[i].equals(other.fieldList[i]))
        return false;
    }
    return true;
  }
}
