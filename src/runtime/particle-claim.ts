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

/** A list of claims made by a particle on a specific handle. */
export class ParticleClaim {
  constructor(readonly handle: HandleConnectionSpec, readonly claims: Claim[]) {}

  toManifestString() {
    const manifestStrings = this.claims.map(claim => claim.toManifestString());
    return `claim ${this.handle.name} ${manifestStrings.join(' and ')}`;
  }
}

/** A specific claim, either a single tag or a single handle derivation. */
export type Claim = ClaimIsTag | ClaimDerivesFrom;

export class ClaimIsTag {
  readonly type: ClaimType.IsTag = ClaimType.IsTag;

  constructor(readonly isNot: boolean, readonly tag: string) {}

  static fromASTNode(astNode: ParticleClaimIsTag) {
    return new ClaimIsTag(astNode.isNot, astNode.tag);
  }

  toManifestString() {
    return `is ${this.isNot ? 'not ' : ''}${this.tag}`;
  }
}

export class ClaimDerivesFrom {
  readonly type: ClaimType.DerivesFrom = ClaimType.DerivesFrom;
  
  constructor(readonly parentHandles: readonly HandleConnectionSpec[]) {}
  
  static fromASTNode(
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

    return new ClaimDerivesFrom(parentHandles);
  }

  toManifestString() {
    return `derives from ${this.parentHandles.map(h => h.name).join(' and derives from ')}`;
  }
}

export function createParticleClaim(
    handle: HandleConnectionSpec,
    astNode: ParticleClaimStatement,
    handleConnectionMap: Map<string, HandleConnectionSpec>): ParticleClaim {
  const claims: Claim[] = astNode.expression.map(claimNode => {
  let claim: Claim;
    switch (claimNode.claimType) {
      case ClaimType.IsTag:
        claim = ClaimIsTag.fromASTNode(claimNode);
        break;
      case ClaimType.DerivesFrom:
        claim = ClaimDerivesFrom.fromASTNode(claimNode, handleConnectionMap);
        break;
      default:
        throw new Error('Unknown claim type.');
    }
    return claim;
  });
  return new ParticleClaim(handle, claims);
}
