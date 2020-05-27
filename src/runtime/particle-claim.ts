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
import {ParticleClaimIsTag, ParticleClaimDerivesFrom, ParticleClaimStatement} from './manifest-ast-nodes.js';
import {Type} from './type.js';
import {assert} from '../platform/assert-web.js';
import {Schema} from './schema.js';

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

  constructor(readonly parentHandle: HandleConnectionSpec) {}

  static fromASTNode(
      astNode: ParticleClaimDerivesFrom,
      handleConnectionMap: Map<string, HandleConnectionSpec>) {

    // Convert handle names into HandleConnectionSpec objects.
    const parentHandle = handleConnectionMap.get(astNode.parentHandle);
  if (!parentHandle) {
    throw new Error(`Unknown "derives from" handle name: ${parentHandle}.`);
  }

    return new ClaimDerivesFrom(parentHandle);
  }

  toManifestString() {
    return `derives from ${this.parentHandle.name}`;
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

/**
 * Validates a field path against the given Type. Throws an exception if the
 * field path is invalid.
 */
export function validateFieldPath(fieldPath: string[], type: Type) {
  if (fieldPath.length === 0) {
    return;
  }
  const schema = type.getEntitySchema();
  if (!schema) {
    throw new Error(`Expected type to contain an entity schema: ${type}.`);
  }

  /** Checks a field path against the given Schema. */
  const checkSchema = (fieldPath: string[], schema: Schema): boolean => {
    if (fieldPath.length === 0) {
      return true;
    }
    const fieldName = fieldPath[0];
    if (!(fieldName in schema.fields)) {
      return false;
    }
    const field = schema.fields[fieldName];
    return checkField(fieldPath, field);
  };

  /** Checks a field path for a particular field definition. */
  const checkField = (fieldPath: string[], field): boolean => {
    switch (field.kind) {
      case 'schema-primitive': {
        // Field path must end here.
        return fieldPath.length === 1;
      }
      case 'schema-collection': {
        // Check inner type.
        return checkField(fieldPath, field.schema);
      }
      case 'schema-reference': {
        // Check rest of field path against inner type.
        return checkSchema(fieldPath.slice(1), field.schema.model.entitySchema);
      }
      default:
        throw new Error(`Unsupported field type: ${JSON.stringify(field)}`);
    }
  };

  if (!checkSchema(fieldPath, schema)) {
    throw new Error(`Field ${fieldPath.join('.')} does not exist in: ${schema.toManifestString()}`);
  }
}
