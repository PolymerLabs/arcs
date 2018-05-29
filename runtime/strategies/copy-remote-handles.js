// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import {HandleMapperBase} from './handle-mapper-base.js';

export class CopyRemoteHandles extends HandleMapperBase {
  constructor(arc) {
    super();
    this._arc = arc;
    this.fate = 'copy';
  }

  getMappableHandles(type, tags=[]) {
    return this._arc.context.findStoreByType(type, {tags, subtype: true});
  }
}
