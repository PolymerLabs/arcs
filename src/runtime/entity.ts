// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import {assert} from '../platform/assert-web.js';

import {Schema} from './schema.js';
import {Symbols} from './symbols.js';
import {Type} from './type.js';

type EntityIdComponents = {
  base: string,
  component: () => number,
};

export type EntityRawData = {};

/**
 * Regular interface for Entities.
 */
export interface EntityInterface {
  isIdentified(): boolean;
  id: string;
  identify(identifier: string): void;
  createIdentity(components: EntityIdComponents): void;
  toLiteral(): EntityRawData;
  dataClone();

  // Used to access dynamic properties, but also may allow access to
  // rawData and other internal state for tests..
  // tslint:disable-next-line: no-any
  [index: string]: any;
}

/**
 * A set of static methods used by Entity implementations.  These are
 * defined dynamically in Schema.  Required because Typescript does
 * not support abstract statics.
 * 
 * @see https://github.com/Microsoft/TypeScript/issues/14600
 * @see https://stackoverflow.com/a/13955591
 */
export interface EntityStaticInterface {
  readonly type: Type;
  readonly key: {tag: string, schema: Schema};
}

/**
 * The merged interfaces.  Replaces usages of typeof Entity.
 */
export type EntityClass = (new (data, userIDComponent?: string) => EntityInterface) & EntityStaticInterface;

export abstract class Entity implements EntityInterface {
  private userIDComponent?: string;

  protected rawData: EntityRawData;

  protected constructor(userIDComponent?: string) {
    assert(!userIDComponent || userIDComponent.indexOf(':') === -1, 'user IDs must not contain the \':\' character');
    this[Symbols.identifier] = undefined;
    this.userIDComponent = userIDComponent;
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

  identify(identifier: string) {
    assert(!this.isIdentified());
    this[Symbols.identifier] = identifier;
    const components = identifier.split(':');
    if (components[components.length - 2] === 'uid') {
      this.userIDComponent = components[components.length - 1];
    }
  }

  createIdentity(components: EntityIdComponents) {
    assert(!this.isIdentified());
    let id: string;
    if (this.userIDComponent) {
      id = `${components.base}:uid:${this.userIDComponent}`;
    } else {
      id = `${components.base}:${components.component()}`;
    }
    this[Symbols.identifier] = id;
  }

  toLiteral(): EntityRawData {
    return this.rawData;
  }

  abstract dataClone(): EntityRawData;
}
