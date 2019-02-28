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

// Id consists of 2 component: a session and an idTree.
export class Id {
  // Session at which a logical object (e.g. an Arc) got created.
  // Part of the stable, permanent ID of this object.
  session: string;
  // Current session. E.g. In which an Arc got deserialized and inflated.
  // This is used to spawn new ids based on this instance.
  readonly currentSession: string;
  private nextIdComponent = 0;
  private readonly components: string[] = [];

  constructor(currentSession: string, components: string[] = []) {
    this.session = currentSession;
    this.currentSession = currentSession;
    this.components = components;
  }

  static newSessionId() {
    const session = Math.floor(Random.next() * Math.pow(2, 50)) + '';
    return new Id(session);
  }

  /**
   * When used in the following way:
   *   const id = Id.newSessionId().fromString(stringId);
   * 
   * The resulting id will receive a newly generated session id in the currentSession field,
   * while maintaining an original session from the string representation in the session field.
   */
  fromString(str: string): Id {
    const newId = new Id(this.currentSession);

    let components = str.split(':');
    if (components[0][0] === '!') {
      newId.session = components[0].slice(1);
      components = components.slice(1);
    }
    newId.components.push(...components);
    return newId;
  }

  // Returns the full Id string.
  toString(): string {
    return `!${this.session}:${this.components.join(':')}`;
  }

  // Returns the idTree as string (without the session component).
  idTreeAsString(): string {
    return this.components.join(':');
  }

  createId(component = ''): Id {
    const id = new Id(this.currentSession, this.components.slice());
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
