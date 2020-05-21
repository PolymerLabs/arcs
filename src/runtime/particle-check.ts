/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import * as AstNode from './manifest-ast-nodes.js';
import {Direction} from './manifest-ast-nodes.js';
import {Claim} from './particle-claim.js';
import {Type} from './type.js';
import {assert} from '../platform/assert-web.js';

/** The different types of trust checks that particles can make. */
export enum CheckType {
  HasTag = 'has-tag',
  IsFromHandle = 'is-from-handle',
  IsFromOutput = 'is-from-output',
  IsFromStore = 'is-from-store',
}

export type CheckTarget = HandleConnectionSpecInterface | ProvideSlotConnectionSpecInterface;

export interface HandleConnectionSpecInterface {
  discriminator: 'HCS';
  direction: Direction;
  name: string;
  type: Type;
  isOptional: boolean;
  tags: string[];
  dependentConnections: HandleConnectionSpecInterface[];
  pattern?: string;
  parentConnection: HandleConnectionSpecInterface | null;
  claims?: Map<string, Claim[]>;
  check?: Check;
  isInput: boolean;
  isOutput: boolean;

  instantiateDependentConnections(particle, typeVarMap: Map<string, Type>): void;
  toSlotConnectionSpec(): ConsumeSlotConnectionSpecInterface;
  isCompatibleType(type: Type): boolean;
}

export interface ConsumeSlotConnectionSpecInterface {
  discriminator: 'CSCS';
  name: string;
  isRequired: boolean;
  isSet: boolean;
  tags: string[];
  formFactor: string;
  handles: string[];
  provideSlotConnections: ProvideSlotConnectionSpecInterface[];
  isOptional: boolean;
  direction: string;
  type: Type;
  dependentConnections: ProvideSlotConnectionSpecInterface[];
}

export interface ProvideSlotConnectionSpecInterface extends ConsumeSlotConnectionSpecInterface {
  discriminator: 'CSCS';
  check?: Check;
}

export class Check {
  constructor(readonly target: CheckTarget, readonly expression: CheckExpression) {}

  toManifestString() {
    let targetString: string;
    if (this.target.discriminator === 'HCS') {
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
export type CheckCondition = CheckHasTag | CheckIsFromHandle | CheckIsFromOutput | CheckIsFromStore;

/** A check condition of the form 'check x is <tag>'. */
export class CheckHasTag {
  readonly type: CheckType.HasTag = CheckType.HasTag;

  constructor(readonly tag: string, readonly isNot: boolean) {}

  static fromASTNode(astNode: AstNode.ParticleCheckHasTag) {
    return new CheckHasTag(astNode.tag, astNode.isNot);
  }

  toManifestString() {
    return `is ${this.isNot ? 'not ' : ''}${this.tag}`;
  }
}

/** A check condition of the form 'check x is from handle <handle>'. */
export class CheckIsFromHandle {
  readonly type: CheckType.IsFromHandle = CheckType.IsFromHandle;

  constructor(readonly parentHandle: HandleConnectionSpecInterface, readonly isNot: boolean) {}

  static fromASTNode(astNode: AstNode.ParticleCheckIsFromHandle, handleConnectionMap: Map<string, HandleConnectionSpecInterface>) {
    const parentHandle = handleConnectionMap.get(astNode.parentHandle);
    if (!parentHandle) {
      throw new Error(`Unknown "check is from handle" handle name: ${astNode.parentHandle}.`);
    }
    return new CheckIsFromHandle(parentHandle, astNode.isNot);
  }

  toManifestString() {
    return `is ${this.isNot ? 'not ' : ''}from handle ${this.parentHandle.name}`;
  }
}

/** A check condition of the form 'check x is from output <output>'. */
export class CheckIsFromOutput {
  readonly type: CheckType.IsFromOutput = CheckType.IsFromOutput;

  constructor(readonly output: HandleConnectionSpecInterface, readonly isNot: boolean) {}

  static fromASTNode(astNode: AstNode.ParticleCheckIsFromOutput, handleConnectionMap: Map<string, HandleConnectionSpecInterface>) {
    const output = handleConnectionMap.get(astNode.output);
    if (!output) {
      throw new Error(`Unknown "check is from output" output name: ${astNode.output}.`);
    }
    return new CheckIsFromOutput(output, astNode.isNot);
  }

  toManifestString() {
    return `is ${this.isNot ? 'not ' : ''}from output ${this.output.name}`;
  }
}

/** A reference to a data store. Can be either the name of the store, or its ID. */
export type StoreReference = {type: 'id' | 'name', store: string};

/** A check condition of the form 'check x is from store <store reference>'. */
export class CheckIsFromStore {
  readonly type: CheckType.IsFromStore = CheckType.IsFromStore;

  constructor(readonly storeRef: StoreReference, readonly isNot: boolean) {}

  static fromASTNode(astNode: AstNode.ParticleCheckIsFromStore) {
    return new CheckIsFromStore({
      type: astNode.storeRef.type,
      store: astNode.storeRef.store,
    }, astNode.isNot);
  }

  toManifestString() {
    let store = this.storeRef.store;
    if (this.storeRef.type === 'id') {
      // Put the ID inside single-quotes.
      store = `'${store}'`;
    }
    return `is ${this.isNot ? 'not ' : ''}from store ${store}`;
  }
}

/** Converts the given AST node into a CheckCondition object. */
function createCheckCondition(astNode: AstNode.ParticleCheckCondition, handleConnectionMap: Map<string, HandleConnectionSpecInterface>): CheckCondition {
  switch (astNode.checkType) {
    case CheckType.HasTag:
      return CheckHasTag.fromASTNode(astNode);
    case CheckType.IsFromHandle:
      return CheckIsFromHandle.fromASTNode(astNode, handleConnectionMap);
    case CheckType.IsFromStore:
      return CheckIsFromStore.fromASTNode(astNode);
    case CheckType.IsFromOutput:
      return CheckIsFromOutput.fromASTNode(astNode, handleConnectionMap);
    default:
      throw new Error('Unknown check type.');
  }
}

/** Converts the given AST node into a CheckExpression object. */
function createCheckExpression(astNode: AstNode.ParticleCheckExpression, handleConnectionMap: Map<string, HandleConnectionSpecInterface>): CheckExpression {
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
    astNode: AstNode.ParticleCheckStatement,
    handleConnectionMap: Map<string, HandleConnectionSpecInterface>): Check {
  const expression = createCheckExpression(astNode.expression, handleConnectionMap);
  return new Check(checkTarget, expression);
}
