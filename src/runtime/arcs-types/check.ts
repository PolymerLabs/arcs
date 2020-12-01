/**
 * @license
 * Copyright 2020 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import * as AstNode from '../manifest-ast-types/manifest-ast-nodes.js';
import {Direction} from './enums.js';
import {Claim} from './claim.js';
import {Type} from '../../types/lib-types.js';
import {assert} from '../../platform/assert-web.js';
import {CheckType} from './enums.js';

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
  claims?: Claim[];
  checks?: Check[];
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
  constructor(
      readonly target: CheckTarget,
      readonly fieldPath: string[],
      readonly expression: CheckExpression) {}

  toManifestString() {
    let targetString = this.targetString;
    if (this.target.discriminator === 'CSCS') {
      // CSCS => slot. For slots we have to add the "data" keyword after the
      // slot name.
      targetString += ' data';
    }
    return `check ${targetString} ${this.expression.toManifestString()}`;
  }

  get targetString(): string {
    if (this.target.discriminator === 'HCS') {
      return [this.target.name, ...this.fieldPath].join('.');
    } else {
      return this.target.name;
    }
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
export type CheckCondition = CheckHasTag | CheckIsFromHandle | CheckIsFromOutput | CheckIsFromStore | CheckImplication;

/** A check condition of the form 'check x is <tag>'. */
export class CheckHasTag {
  readonly type: CheckType.HasTag = CheckType.HasTag;

  constructor(readonly tag: string, readonly isNot: boolean) {}

  static fromASTNode(astNode: AstNode.CheckHasTag) {
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

  static fromASTNode(astNode: AstNode.CheckIsFromHandle, handleConnectionMap: Map<string, HandleConnectionSpecInterface>) {
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

  static fromASTNode(astNode: AstNode.CheckIsFromOutput, handleConnectionMap: Map<string, HandleConnectionSpecInterface>) {
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

  static fromASTNode(astNode: AstNode.CheckIsFromStore) {
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

/** A check condition of the form 'check x (A => B)'. */
export class CheckImplication {
  readonly type: CheckType.Implication = CheckType.Implication;
  readonly isNot = false;

  constructor(readonly antecedent: CheckExpression, readonly consequent: CheckExpression) {}

  static fromASTNode(astNode: AstNode.CheckImplication, handleConnectionMap: Map<string, HandleConnectionSpecInterface>) {
    const antecedent = createCheckExpression(astNode.antecedent, handleConnectionMap);
    const consequent = createCheckExpression(astNode.consequent, handleConnectionMap);
    return new CheckImplication(antecedent, consequent);
  }

  toManifestString() {
    return `(${this.antecedent.toManifestString(/* requireParens= */ true)} => ${this.consequent.toManifestString(/* requireParens= */ true)})`;
  }
}

/** Converts the given AST node into a CheckCondition object. */
function createCheckCondition(astNode: AstNode.CheckCondition, handleConnectionMap: Map<string, HandleConnectionSpecInterface>): CheckCondition {
  switch (astNode.checkType) {
    case CheckType.HasTag:
      return CheckHasTag.fromASTNode(astNode);
    case CheckType.IsFromHandle:
      return CheckIsFromHandle.fromASTNode(astNode, handleConnectionMap);
    case CheckType.IsFromStore:
      return CheckIsFromStore.fromASTNode(astNode);
    case CheckType.IsFromOutput:
      return CheckIsFromOutput.fromASTNode(astNode, handleConnectionMap);
    case CheckType.Implication:
      return CheckImplication.fromASTNode(astNode, handleConnectionMap);
    default:
      throw new Error(`Unknown check type: ${JSON.stringify(astNode)}`);
  }
}

/** Converts the given AST node into a CheckExpression object. */
function createCheckExpression(astNode: AstNode.CheckExpression, handleConnectionMap: Map<string, HandleConnectionSpecInterface>): CheckExpression {
  if (astNode.kind === 'check-boolean-expression') {
    assert(astNode.children.length >= 2, 'Boolean check expressions must have at least two children.');
    return new CheckBooleanExpression(astNode.operator, astNode.children.map(child => createCheckExpression(child, handleConnectionMap)));
  } else {
    return createCheckCondition(astNode, handleConnectionMap);
  }
}

/** Converts the given AST node into a Check object. */
export function createCheck(
    checkTarget: CheckTarget,
    astNode: AstNode.CheckStatement,
    handleConnectionMap: Map<string, HandleConnectionSpecInterface>): Check {
  const expression = createCheckExpression(astNode.expression, handleConnectionMap);
  return new Check(checkTarget, astNode.target.fieldPath, expression);
}
