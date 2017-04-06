// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt
'use strict';

class Viewlet {
  constructor(view) {
    this._view = view;
  }
  on(kind, callback, target) {
    return this._view.on(kind, callback, target);
  }
}

class View extends Viewlet {
  constructor(view) {
    // TODO: this should talk to an API inside the PEC.
    super(view);
  }
  query() {
    // TODO: things
  }
  toList() {
    // TODO: remove this and use query instead
    return this._view.toList();
  }
  store(entity) {
    return this._view.store(entity);
  }
}

class Variable extends Viewlet {
  constructor(variable) {
    super(variable);
  }
  get() {
    return this._view.get();
  }
  // TODO: this should be async
  set(entity) {
    return this._view.set(entity);
  }
}

exports.View = View;
exports.Variable = Variable;
