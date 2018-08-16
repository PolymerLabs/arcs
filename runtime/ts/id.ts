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
  private session: string;
  private currentSession: string;
  private nextIdComponent = 0;
  private components: string[] = [];

  constructor(currentSession: string) {
    this.session = currentSession;
    this.currentSession = currentSession;
  }

  static newSessionId() {
    const session = Math.floor(Random.next() * Math.pow(2, 50)) + '';
    return new Id(session);
  }

  fromString(str: string): Id {
    const components = str.split(':');
    const id = new Id(this.currentSession);

    if (components[0][0] === '!') {
      id.session = components[0].slice(1);
      id.components = components.slice(1);
    } else {
      id.components = components;
    }

    return id;
  }

  toString(): string {
    return `!${this.session}:${this.components.join(':')}`;
  }

  // Only use this for testing!
  toStringWithoutSessionForTesting(): string {
    return this.components.join(':');
  }

  createId(component = ''): Id {
    const id = new Id(this.currentSession);
    id.components = this.components.slice();
    id.components.push(component + this.nextIdComponent++);
    return id;
  }

  equal(id: Id): boolean {
    if (id.session !== this.session || id.components.length !== this.components.length) {
      return false;
    }
    for (let i = 0; i < id.components.length; i++) {
      if (id.components[i] !== this.components[i]) {
        return false;
      }
    }
    return true;
  }
}
