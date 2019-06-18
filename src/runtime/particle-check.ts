/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {ParticleCheckStatement} from './manifest-ast-nodes';
import {HandleConnectionSpec} from './particle-spec';

export class Check {
  constructor(readonly handle: HandleConnectionSpec, readonly acceptedTags: readonly string[]) {}

  static fromASTNode(handle: HandleConnectionSpec, astNode: ParticleCheckStatement) {
    return new Check(handle, astNode.trustTags);
  }

  toManifestString() {
    return `check ${this.handle.name} is ${this.acceptedTags.join(' or is ')}`;
  }

  toShortString() {
    return this.acceptedTags.join('|');
  }
}
