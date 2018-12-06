// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import {assert} from '../platform/assert-web.js';
import {Symbols} from './symbols.js';

export abstract class Entity {
  private userIDComponent?: string;

  // tslint:disable-next-line: no-any
  protected rawData: any;

  protected constructor(userIDComponent?: string) {
    assert(!userIDComponent || userIDComponent.indexOf(':') === -1, 'user IDs must not contain the \':\' character');
    this[Symbols.identifier] = undefined;
    this.userIDComponent = userIDComponent;
  }

  get data() {
    return undefined;
  }

  getUserID(): string {
    return this.userIDComponent;
  }

  isIdentified(): boolean {
    return this[Symbols.identifier] !== undefined;
  }

  // TODO: entity should not be exposing its IDs.
  get id() {
    assert(!!this.isIdentified());
    return this[Symbols.identifier];
  }

  identify(identifier) {
    assert(!this.isIdentified());
    this[Symbols.identifier] = identifier;
    const components = identifier.split(':');
    if (components[components.length - 2] === 'uid') {
      this.userIDComponent = components[components.length - 1];
    }
  }

  createIdentity(components) {
    assert(!this.isIdentified());
    let id;
    if (this.userIDComponent) {
      id = `${components.base}:uid:${this.userIDComponent}`;
    } else {
      id = `${components.base}:${components.component()}`;
    }
    this[Symbols.identifier] = id;
  }

  toLiteral() {
    return this.rawData;
  }
}
