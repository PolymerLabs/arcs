/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {ParticleCheckStatement, ParticleCheckHasTag, ParticleCheckIsFromHandle, ParticleCheckExpression, ParticleCheckCondition} from './manifest-ast-nodes.js';
import {HandleConnectionSpec, ProvideSlotConnectionSpec} from './particle-spec.js';
import {assert} from '../platform/assert-web.js';

/** The different types of trust checks that particles can make. */
export enum CheckType {
  HasTag = 'has-tag',
  IsFromHandle = 'is-from-handle',
}

export type CheckTarget = HandleConnectionSpec | ProvideSlotConnectionSpec;

export class Check {
  constructor(readonly target: CheckTarget, readonly expression: CheckExpression) {}

  toManifestString() {
    let targetString: string;
    if (this.target instanceof HandleConnectionSpec) {
      targetString = this.target.name;
    } else {
      targetString = `${this.target.name} data`;
    }
    return `check ${targetString} ${this.expression.toManifestString()}`;
  }
}

/** A boolean expression inside a trust check. */
export class CheckBooleanExpression {
  constructor(readonly type: 'or' | 'and', readonly children: readonly CheckExpression[]) {}

  /**
   * @inheritdoc
   * @param requireParens Indicates whether to enclose the expression inside parentheses. All nested boolean expressions must have parentheses,
   *     but a top-level expression doesn't need to.
   */
  toManifestString(requireParens: boolean = false) {
    const str = this.children.map(child => child.toManifestString(/* requireParens= */ true)).join(` ${this.type} `);
    return requireParens ? `(${str})` : str;
  }
}

/** An expression inside a trust check. Can be either a boolean expression or a single check condition. */
export type CheckExpression = CheckBooleanExpression | CheckCondition;

/** A single check condition inside a trust check. */
export type CheckCondition = CheckHasTag | CheckIsFromHandle;

/** A check condition of the form 'check x is <tag>'. */
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

/** A check condition of the form 'check x is from handle <handle>'. */
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

/** Converts the given AST node into a CheckCondition object. */
function createCheckCondition(astNode: ParticleCheckCondition, handleConnectionMap: Map<string, HandleConnectionSpec>): CheckCondition {
  switch (astNode.checkType) {
    case CheckType.HasTag:
      return CheckHasTag.fromASTNode(astNode);
    case CheckType.IsFromHandle:
      return CheckIsFromHandle.fromASTNode(astNode, handleConnectionMap);
    default:
      throw new Error('Unknown check type.');
  }
}

/** Converts the given AST node into a CheckExpression object. */
function createCheckExpression(astNode: ParticleCheckExpression, handleConnectionMap: Map<string, HandleConnectionSpec>): CheckExpression {
  if (astNode.kind === 'particle-trust-check-boolean-expression') {
    assert(astNode.children.length >= 2, 'Boolean check expressions must have at least two children.');
    return new CheckBooleanExpression(astNode.operator, astNode.children.map(child => createCheckExpression(child, handleConnectionMap)));
  } else {
    return createCheckCondition(astNode, handleConnectionMap);
  }
}

/** Converts the given AST node into a Check object. */
export function createCheck(
    checkTarget: CheckTarget,
    astNode: ParticleCheckStatement,
    handleConnectionMap: Map<string, HandleConnectionSpec>): Check {
  const expression = createCheckExpression(astNode.expression, handleConnectionMap);
  return new Check(checkTarget, expression);
}
