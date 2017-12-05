// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt
'use strict';

import assert from '../platform/assert-web.js';

class ManifestView {
  constructor() {
    this._version = null;
    this._id = null;
    this._entities = [];
    this._type = null; // not optional!
    this.localName = null;
  }
  get version() {
    return this._version;
  }
  set version(version) {
    this._version = version;
  }
  get id() {
    return this._id;
  }
  set id(id) {
    this._id = id;
  }
  get entities() {
    return this._entities;
  }
  addEntity(entity) {
    // This should be in the format used by Handle.
    assert(entity.rawData != null);
    this._entities.push(entity);
  }
  get type() {
    return this._type;
  }
  set type(type) {
    this._type = type;
  }
  isValid() {
    return !!this._type;
    // TODO: id implies version required
    // TODO: duplicate entities? entities have id/rawData?
  }
}

export default ManifestView;
