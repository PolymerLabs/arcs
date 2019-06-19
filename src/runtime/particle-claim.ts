/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {HandleConnectionSpec} from './particle-spec';
import {ParticleClaimIsTag, ParticleClaimDerivesFrom, ParticleClaimStatement} from './manifest-ast-nodes';

/** The different types of trust claims that particles can make. */
export enum ClaimType {
  IsTag = 'is-tag',
  DerivesFrom = 'derives-from',
}

export type Claim = ClaimIsTag | ClaimDerivesFrom;

export class ClaimIsTag {
  readonly type: ClaimType.IsTag = ClaimType.IsTag;

  constructor(readonly handle: HandleConnectionSpec, readonly tag: string) {}

  static fromASTNode(handle: HandleConnectionSpec, astNode: ParticleClaimIsTag) {
    return new ClaimIsTag(handle, astNode.tag);
  }

  toManifestString() {
    return `claim ${this.handle.name} is ${this.tag}`;
  }
}

export class ClaimDerivesFrom {
  readonly type: ClaimType.DerivesFrom = ClaimType.DerivesFrom;
  
  constructor(readonly handle: HandleConnectionSpec, readonly parentHandles: readonly HandleConnectionSpec[]) {}
  
  static fromASTNode(
      handle: HandleConnectionSpec,
      astNode: ParticleClaimDerivesFrom,
      handleConnectionMap: Map<string, HandleConnectionSpec>) {
    
    // Convert handle names into HandleConnectionSpec objects.
    const parentHandles = astNode.parentHandles.map(parentHandleName => {
      const parentHandle = handleConnectionMap.get(parentHandleName);
      if (!parentHandle) {
        throw new Error(`Unknown "derives from" handle name: ${parentHandle}.`);
      }
      return parentHandle;
    });

    return new ClaimDerivesFrom(handle, parentHandles);
  }

  toManifestString() {
    return `claim ${this.handle.name} derives from ${this.parentHandles.map(h => h.name).join(' and ')}`;
  }
}

export function createClaim(
    handle: HandleConnectionSpec,
    astNode: ParticleClaimStatement,
    handleConnectionMap: Map<string, HandleConnectionSpec>): Claim {
  switch (astNode.claimType) {
    case ClaimType.IsTag:
      return ClaimIsTag.fromASTNode(handle, astNode);
    case ClaimType.DerivesFrom:
      return ClaimDerivesFrom.fromASTNode(handle, astNode, handleConnectionMap);
    default:
      throw new Error('Unknown claim type.');
  }
}