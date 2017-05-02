/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

class Schema {
  constructor(parsedSchema, parent) {
    this.name = parsedSchema.name;
    this.parent = parent;
    this._normative = {};
    this._optional = {};
    for (var section of parsedSchema.sections) {
      var into = section.sectionType == 'normative' ? this._normative : this._optional;
      for (var field in section.fields) {
        // TODO normalize field types here?
        into[field] = section.fields[field];
      }
    }
  }

  get normative() {
    var dict = this.parent ? this.parent.normative : {};
    for (var key in this._normative)
      dict[key] = this._normative[key];
    return dict;
  }

  get optional() {
    var dict = this.parent ? this.parent.optional : {};
    for (var key in this._optional)
      dict[key] = this._optional[key];
    return dict;
  }  
}

module.exports = Schema;