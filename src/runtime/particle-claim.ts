/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {HandleConnectionSpec} from './particle-spec.js';
import {ParticleClaimIsTag, ParticleClaimDerivesFrom, ParticleClaimStatement, Direction} from './manifest-ast-nodes.js';
import {validateFieldPath} from './field-path.js';

/** The different types of trust claims that particles can make. */
export enum ClaimType {
  IsTag = 'is-tag',
  DerivesFrom = 'derives-from',
}

/**
 * A list of claims made by a particle on a specific handle (or on a field
 * inside a handle).
 */
export class ParticleClaim {
  constructor(
      readonly handle: HandleConnectionSpec,
      readonly fieldPath: string[],
      readonly claims: Claim[]) {}

  toManifestString() {
    const manifestStrings = this.claims.map(claim => claim.toManifestString());
    return `claim ${this.target} ${manifestStrings.join(' and ')}`;
  }

  get target(): string {
    return [this.handle.name, ...this.fieldPath].join('.');
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

  constructor(
      readonly parentHandle: HandleConnectionSpec,
      readonly fieldPath: string[]) {}

  static fromASTNode(
      astNode: ParticleClaimDerivesFrom,
      handleConnectionMap: Map<string, HandleConnectionSpec>) {

    // Convert handle names into HandleConnectionSpec objects.
    const parentHandle = handleConnectionMap.get(astNode.parentHandle);
    if (!parentHandle) {
      throw new Error(`Unknown "derives from" handle name: ${parentHandle}.`);
    }

    validateFieldPath(astNode.fieldPath, parentHandle.type);

    return new ClaimDerivesFrom(parentHandle, astNode.fieldPath);
  }

  get target(): string {
    return [this.parentHandle.name, ...this.fieldPath].join('.');
  }

  toManifestString() {
    return `derives from ${this.target}`;
  }
}

export function createParticleClaim(
    handle: HandleConnectionSpec,
    astNode: ParticleClaimStatement,
    handleConnectionMap: Map<string, HandleConnectionSpec>): ParticleClaim {
  const claims: Claim[] = astNode.expression.map(claimNode => {
    switch (claimNode.claimType) {
      case ClaimType.IsTag:
        return ClaimIsTag.fromASTNode(claimNode);
      case ClaimType.DerivesFrom:
        return ClaimDerivesFrom.fromASTNode(claimNode, handleConnectionMap);
      default:
        throw new Error('Unknown claim type.');
    }
  });
  return new ParticleClaim(handle, astNode.fieldPath, claims);
}
