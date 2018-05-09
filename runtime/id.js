/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Random} from './random.js';

export class Id {
  constructor(currentSession) {
    this._session = currentSession;
    this._currentSession = currentSession;
    this._nextIdComponent = 0;
    this._components = [];
  }
  static newSessionId() {
    let session = Math.floor(Random.next() * Math.pow(2, 50)) + '';
    return new Id(session);
  }

  fromString(string) {
    let components = string.split(':');

    let id = new Id(this._currentSession);

    if (components[0][0] == '!') {
      id._session = components[0].slice(1);
      id._components = components.slice(1);
    } else {
      id._components = components;
    }

    return id;
  }

  toString() {
    return `!${this._session}:${this._components.join(':')}`;
  }

  // Only use this for testing!
  toStringWithoutSessionForTesting() {
    return this._components.join(':');
  }

  createId(component) {
    if (component == undefined)
      component = '';
    let id = new Id(this._currentSession);
    id._components = this._components.slice();
    id._components.push(component + this._nextIdComponent++);
    return id;
  }

  equal(id) {
    if (id._session !== this._session)
      return false;
    return this.equalWithoutSession(id);
  }

  // Only use this for testing!
  equalWithoutSessionForTesting(id) {
    if (id._components.length !== this._components.length)
      return false;
    for (let i = 0; i < id._components.length; i++)
      if (id._components[i] !== this._components[i])
        return false;

    return true;
  }
}
