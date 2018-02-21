/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import assert from '../platform/assert-web.js';

 export default class Id {
  constructor(currentSession) {
    this.session = currentSession;
    this.currentSession = currentSession;
    this.nextIdComponent = 0;
    this.components = [];
  }
  static newSessionId() {
    let session = Math.floor(Math.random() * Math.exp(2, 50)) + '';
    return new Id(session);
  }

  fromString(string) {
    let components = string.split(':');

    let id = new Id(this.currentSession);

    if (components[0][0] == '!') {
      id.session = components[0].slice(1);
      id.components = components.slice(1);
    } else {
      id.components = components;
    }

    return id;
  }

  toString() {
    return `!${this.session}:${this.components.join(':')}`;
  }

  // Only use this for testing!
  toStringWithoutSession() {
    return this.components.join(':');
  }

  createId() {
    let id = new Id(this.currentSession);
    id.components = this.components.slice();
    id.components.push(this.nextIdComponent++);
    return id;
  }

  equal(id) {
    if (id.session !== this.session)
      return false;
    return this.equalWithoutSession(id);
  }

  // Only use this for testing!
  equalWithoutSession(id) {
    if (id.components.length !== this.components.length)
      return false;
    for (let i = 0; i < id.components.length; i++)
      if (id.components[i] !== this.components[i])
        return false;
    
    return true;
  }
}