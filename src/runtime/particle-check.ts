/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {ParticleCheckStatement, ParticleCheckHasTag, ParticleCheckIsFromHandle} from './manifest-ast-nodes';
import {HandleConnectionSpec} from './particle-spec';

/** The different types of trust checks that particles can make. */
export enum CheckType {
  HasTag = 'has-tag',
  IsFromHandle = 'is-from-handle',
}

export class Check {
  constructor(readonly handle: HandleConnectionSpec, readonly conditions: readonly CheckCondition[]) {}

  toManifestString() {
    return `check ${this.handle.name} ${this.conditions.map(c => c.toManifestString()).join(' or ')}`;
  }
}

export type CheckCondition = CheckHasTag | CheckIsFromHandle;

export class CheckHasTag {
  readonly type: CheckType.HasTag = CheckType.HasTag;

  constructor(readonly tag: string) {}

  static fromASTNode(astNode: ParticleCheckHasTag) {
    return new CheckHasTag(astNode.tag);
  }

  toManifestString() {
    return `is ${this.tag}`;
  }
}

export class CheckIsFromHandle {
  readonly type: CheckType.IsFromHandle = CheckType.IsFromHandle;

  constructor(readonly parentHandle: HandleConnectionSpec) {}

  static fromASTNode(astNode: ParticleCheckIsFromHandle, handleConnectionMap: Map<string, HandleConnectionSpec>) {
    const parentHandle = handleConnectionMap.get(astNode.parentHandle);
    if (!parentHandle) {
      throw new Error(`Unknown "check is from handle" handle name: ${parentHandle}.`);
    }
    return new CheckIsFromHandle(parentHandle);
  }

  toManifestString() {
    return `is from handle ${this.parentHandle.name}`;
  }
}

export function createCheck(
    handle: HandleConnectionSpec,
    astNode: ParticleCheckStatement,
    handleConnectionMap: Map<string, HandleConnectionSpec>): Check {
  const conditions = astNode.conditions.map(condition => {
    switch (condition.checkType) {
      case CheckType.HasTag:
        return CheckHasTag.fromASTNode(condition);
      case CheckType.IsFromHandle:
        return CheckIsFromHandle.fromASTNode(condition, handleConnectionMap);
      default:
        throw new Error('Unknown check type.');
    }
  });
  return new Check(handle, conditions);
}
