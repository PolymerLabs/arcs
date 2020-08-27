/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../platform/assert-web.js';
import {SlotInfo} from './slot-info.js';
import {Predicate, Literal} from '../utils/hot.js';
import {CRDTTypeRecord, CRDTModel, CRDTCount, CRDTCollection, CRDTSingleton} from '../crdt/lib-crdt.js';
import {Schema} from './schema.js';
import {ParticleSpec} from './arcs-types/particle-spec.js';
import {Refinement} from './refiner.js';
import {AnnotationRef} from './recipe/annotation.js';
import {IndentingStringBuilder} from '../utils/indenting-string-builder.js';
import {Direction, SlotDirection} from './arcs-types/enums.js';

export interface TypeLiteral extends Literal {
  tag: string;
  // tslint:disable-next-line: no-any
  data?: any;
}

export type Tag = 'Entity' | 'TypeVariable' | 'Collection' | 'BigCollection' | 'Tuple' |
  'Interface' | 'Slot' | 'Reference' | 'Arc' | 'Handle' | 'Count' | 'Singleton' | 'Mux';

type TypeFromLiteral = (literal: TypeLiteral) => Type;

export abstract class Type {
  tag: Tag;

  protected constructor(tag: Tag) {
    this.tag = tag;
  }

  static fromLiteral : TypeFromLiteral = null;

  abstract toLiteral(): TypeLiteral;

  // Combines type ranges of this and the given type, and returns the smallest
  // contained range.
  abstract restrictTypeRanges(type: Type): Type;

  static unwrapPair(type1: Type, type2: Type): [Type, Type] {
    if (type1.tag === type2.tag) {
      const contained1 = type1.getContainedType();
      if (contained1 !== null) {
        return Type.unwrapPair(contained1, type2.getContainedType());
      }
    }
    return [type1, type2];
  }

  static tryUnwrapMulti(type1: Type, type2: Type): [Type[], Type[]] {
    [type1, type2] = this.unwrapPair(type1, type2);
    if (type1.tag === type2.tag) {
      const contained1 = type1.getContainedTypes();
      if (contained1 !== null) {
        return [contained1, type2.getContainedTypes()];
      }
    }
    return [null, null];
  }

  /** Tests whether two types' constraints are compatible with each other. */
  static canMergeConstraints(type1: Type, type2: Type): boolean {
    return Type._canMergeCanReadSubset(type1, type2) && Type._canMergeCanWriteSuperset(type1, type2);
  }

  static _canMergeCanReadSubset(type1: Type, type2: Type): boolean {
    if (type1.canReadSubset && type2.canReadSubset) {
      if (type1.canReadSubset.tag !== type2.canReadSubset.tag) {
        return false;
      }
      if (type1.canReadSubset instanceof EntityType && type2.canReadSubset instanceof EntityType) {
        return Schema.intersect(type1.canReadSubset.entitySchema, type2.canReadSubset.entitySchema) !== null;
      }
      throw new Error(`_canMergeCanReadSubset not implemented for types tagged with ${type1.canReadSubset.tag}`);
    }
    return true;
  }

  static _canMergeCanWriteSuperset(type1: Type, type2: Type): boolean {
    if (type1.canWriteSuperset && type2.canWriteSuperset) {
      if (type1.canWriteSuperset.tag !== type2.canWriteSuperset.tag) {
        return false;
      }
      if (type1.canWriteSuperset instanceof EntityType && type2.canWriteSuperset instanceof EntityType) {
        return Schema.union(type1.canWriteSuperset.entitySchema, type2.canWriteSuperset.entitySchema) !== null;
      }
    }
    return true;
  }

  isSlot(): this is SlotType {
    return this instanceof SlotType;
  }

  slandleType(): SlotType | undefined {
    if (this.isSlot()) {
      return this;
    }
    if (this.isCollectionType() && this.collectionType.isSlot()) {
      return this.collectionType;
    }
    return undefined;
  }


  // If you want to type-check fully, this is an improvement over just using
  // this instanceof CollectionType,
  // because instanceof doesn't propagate generic restrictions.
  isCollectionType<T extends Type>(): this is CollectionType<T> {
    return this instanceof CollectionType;
  }

  // If you want to type-check fully, this is an improvement over just using
  // this instaneceof BigCollectionType,
  // because instanceof doesn't propagate generic restrictions.
  isBigCollectionType<T extends Type>(): this is BigCollectionType<T> {
    return this instanceof BigCollectionType;
  }

  isReferenceType(): this is ReferenceType<Type> {
    return this instanceof ReferenceType;
  }

  isMuxType(): this is MuxType<EntityType> {
    return this instanceof MuxType && this.innerType instanceof  EntityType;
  }

  isTupleType(): this is TupleType {
    return this instanceof TupleType;
  }

  isResolved(): boolean {
    // TODO: one of these should not exist.
    return !this.hasUnresolvedVariable;
  }

  mergeTypeVariablesByName(variableMap: Map<string, Type>): Type {
    return this;
  }

  _applyExistenceTypeTest(test: Predicate<Type>): boolean {
    return test(this);
  }

  get hasVariable(): boolean {
    return this._applyExistenceTypeTest(type => type instanceof TypeVariable);
  }

  get hasUnresolvedVariable(): boolean {
    return this._applyExistenceTypeTest(type => type instanceof TypeVariable && !type.variable.isResolved());
  }

  getContainedType(): Type|null {
    return null;
  }

  getContainedTypes(): Type[]|null {
    return null;
  }

  isTypeContainer(): boolean {
    return false;
  }

  get isReference(): boolean {
    return false;
  }

  get isMux(): boolean {
    return false;
  }

  get isSingleton(): boolean {
    return false;
  }

  get isCollection(): boolean {
    return false;
  }

  get isEntity(): boolean {
    return false;
  }

  get isInterface(): boolean {
    return false;
  }

  get isTuple(): boolean {
    return false;
  }

  get isVariable(): boolean {
    return false;
  }

  collectionOf() {
    return new CollectionType(this);
  }

  singletonOf() {
    return new SingletonType(this);
  }

  bigCollectionOf() {
    return new BigCollectionType(this);
  }

  referenceTo() {
    return new ReferenceType(this);
  }

  muxTypeOf() {
    return new MuxType(this);
  }

  resolvedType(): Type {
    return this;
  }

  canEnsureResolved(): boolean {
    return this.isResolved() || this._canEnsureResolved();
  }

  protected _canEnsureResolved(): boolean {
    return true;
  }

  maybeEnsureResolved(options = undefined): boolean {
    return true;
  }

  get canWriteSuperset(): Type {
    throw new Error(`canWriteSuperset not implemented for ${this}`);
  }

  get canReadSubset(): Type {
    throw new Error(`canReadSubset not implemented for ${this}`);
  }

  isAtLeastAsSpecificAs(type: Type): boolean {
    return this.tag === type.tag && this._isAtLeastAsSpecificAs(type);
  }

  protected _isAtLeastAsSpecificAs(type: Type): boolean {
    throw new Error(`isAtLeastAsSpecificAs not implemented for ${this}`);
  }

  /**
   * Clone a type object.
   * When cloning multiple types, variables that were associated with the same name
   * before cloning should still be associated after cloning. To maintain this
   * property, create a Map() and pass it into all clone calls in the group.
   */
  clone(variableMap: Map<string, Type>) {
    return this.resolvedType()._clone(variableMap);
  }

  protected _clone(variableMap: Map<string, Type>) {
    return Type.fromLiteral(this.toLiteral());
  }

  /**
   * Clone a type object, maintaining resolution information.
   * This function SHOULD NOT BE USED at the type level. In order for type variable
   * information to be maintained correctly, an entire context root needs to be
   * cloned.
   */
  _cloneWithResolutions(variableMap): Type {
    return Type.fromLiteral(this.toLiteral());
  }

  // TODO: is this the same as _applyExistenceTypeTest
  hasProperty(property): boolean {
    return property(this) || this._hasProperty(property);
  }

  protected _hasProperty(property): boolean {
    return false;
  }

  toString(options = undefined): string {
    return this.tag;
  }

  getEntitySchema(): Schema|null {
    return null;
  }

  toPrettyString(): string|null {
    return null;
  }

  crdtInstanceConstructor<T extends CRDTTypeRecord>(): (new () => CRDTModel<T>) | null {
    return null;
  }

  handleConstructor<T extends CRDTTypeRecord>() {
    return null;
  }
}

export class CountType extends Type {
  constructor() {
    super('Count');
  }

  toLiteral(): TypeLiteral {
    return {tag: 'Count'};
  }

  restrictTypeRanges(type: Type): Type {
    assert(this.tag === type.tag);
    throw new Error(`'restrictTypeRanges' is not supported for ${this.tag}`);
  }

  crdtInstanceConstructor() {
    return CRDTCount;
  }
}

export class SingletonType<T extends Type> extends Type {
  private readonly innerType: T;
  static handleClass = null;
  constructor(type: T) {
    super('Singleton');
    this.innerType = type;
  }

  toLiteral(): TypeLiteral {
    return {tag: 'Singleton', data: this.innerType.toLiteral()};
  }

  getContainedType(): T {
    return this.innerType;
  }

  crdtInstanceConstructor() {
    return CRDTSingleton;
  }

  handleConstructor<T>() {
    return SingletonType.handleClass;
  }

  get isSingleton(): boolean {
    return true;
  }

  getEntitySchema(): Schema {
    return this.innerType.getEntitySchema();
  }

  toString(options = undefined): string {
    return `![${this.innerType.toString(options)}]`;
  }

  get canWriteSuperset(): Type {
    return this.innerType.canWriteSuperset;
  }

  get canReadSubset() {
    return this.innerType.canReadSubset;
  }

  restrictTypeRanges(type: Type): Type {
    assert(this.tag === type.tag);
    return new SingletonType(this.innerType.restrictTypeRanges(type));
  }

  mergeTypeVariablesByName(variableMap: Map<string, Type>) {
    const innerType = this.innerType;
    const result = innerType.mergeTypeVariablesByName(variableMap);
    return (result === innerType) ? this : result.singletonOf();
  }
}

export class EntityType extends Type {
  readonly entitySchema: Schema;

  constructor(schema: Schema) {
    super('Entity');
    this.entitySchema = schema;
  }

  static make(
    names: string[],
    fields: {},
    options: {description?, refinement?: Refinement, annotations?: AnnotationRef[]} = {}
  ): EntityType {
    return new EntityType(new Schema(names, fields, options));
  }

  // These type identifier methods are being left in place for non-runtime code.
  get isEntity(): boolean {
    return true;
  }

  get canWriteSuperset(): EntityType {
    return this;
  }

  get canReadSubset(): EntityType {
    return this;
  }

  _isAtLeastAsSpecificAs(type: EntityType): boolean {
    return this.entitySchema.isAtLeastAsSpecificAs(type.entitySchema);
  }

  toLiteral(): TypeLiteral {
    return {tag: this.tag, data: this.entitySchema.toLiteral()};
  }

  toString(options = undefined): string {
    return this.entitySchema.toInlineSchemaString(options);
  }

  getEntitySchema(): Schema {
    return this.entitySchema;
  }

  _cloneWithResolutions(variableMap): EntityType {
    if (variableMap.has(this.entitySchema)) {
      return variableMap.get(this.entitySchema);
    }
    const clonedEntityType = new EntityType(this.entitySchema);
    variableMap.set(this.entitySchema, clonedEntityType);
    return clonedEntityType;
  }

  toPrettyString(): string {
    if (this.entitySchema.description.pattern) {
      return this.entitySchema.description.pattern;
    }

    // Spit MyTypeFOO to My Type FOO
    if (this.entitySchema.name) {
      return this.entitySchema.name.replace(/([^A-Z])([A-Z])/g, '$1 $2')
                                   .replace(/([A-Z][^A-Z])/g, ' $1')
                                   .replace(/[\s]+/g, ' ')
                                   .trim();
    }
    return JSON.stringify(this.entitySchema.toLiteral());
  }

  crdtInstanceConstructor() {
    return this.entitySchema.crdtConstructor();
  }

  handleConstructor<T>() {
    // Currently using SingletonHandle as the implementation for Entity handles.
    // TODO: Make an EntityHandle class that uses the proper Entity CRDT.
    throw new Error(`Entity handle not yet implemented - you probably want to use a SingletonType`);
  }

  restrictTypeRanges(type: Type): Type {
    assert(this.tag === type.tag);
    assert(this.getEntitySchema().name === type.getEntitySchema().name);
    return new EntityType(
        Schema.intersect(this.getEntitySchema(), type.getEntitySchema()));
  }
}

export class TypeVariable extends Type {
  readonly variable: TypeVariableInfo;

  constructor(variable: TypeVariableInfo) {
    super('TypeVariable');
    this.variable = variable;
  }

  static make(name: string, canWriteSuperset: Type = null, canReadSubset: Type = null, resolvesToMaxType = false): TypeVariable {
    return new TypeVariable(new TypeVariableInfo(name, canWriteSuperset, canReadSubset, resolvesToMaxType));
  }

  get isVariable(): boolean {
    return true;
  }

  protected _isAtLeastAsSpecificAs(type: Type): boolean {
    return this.variable.isAtLeastAsSpecificAs(
        type.isVariable ? (type as TypeVariable).variable : new TypeVariableInfo('', type, type, this.variable.resolveToMaxType));
  }

  mergeTypeVariablesByName(variableMap: Map<string, Type>) {
    const name = this.variable.name;
    let variable = variableMap.get(name);
    if (!variable) {
      variable = this;
      variableMap.set(name, this);
    } else if (variable instanceof TypeVariable) {
      if (variable.variable.hasConstraint || this.variable.hasConstraint) {
        const mergedConstraint = variable.variable.maybeMergeConstraints(this.variable);
        if (!mergedConstraint) {
          throw new Error('could not merge type variables');
        }
      }
    }
    return variable;
  }

  resolvedType() {
    return this.variable.resolution || this;
  }

  _canEnsureResolved() {
    return this.variable.canEnsureResolved();
  }

  maybeEnsureResolved(options = undefined): boolean {
    return this.variable.maybeEnsureResolved(options);
  }

  get canWriteSuperset() {
    return this.variable.canWriteSuperset;
  }

  get canReadSubset() {
    return this.variable.canReadSubset;
  }

  _clone(variableMap) {
    const name = this.variable.name;
    if (variableMap.has(name)) {
      return new TypeVariable(variableMap.get(name));
    } else {
      const newTypeVariable = TypeVariableInfo.fromLiteral(this.variable.toLiteral());
      variableMap.set(name, newTypeVariable);
      return new TypeVariable(newTypeVariable);
    }
  }

  _cloneWithResolutions(variableMap: Map<TypeVariableInfo|Schema, TypeVariableInfo|Schema>): TypeVariable {
    if (variableMap.has(this.variable)) {
      return new TypeVariable(variableMap.get(this.variable) as TypeVariableInfo);
    } else {
      const newTypeVariable = TypeVariableInfo.fromLiteral(this.variable.toLiteralIgnoringResolutions());
      if (this.variable.resolution) {
        newTypeVariable._resolution = this.variable._resolution._cloneWithResolutions(variableMap);
      }
      if (this.variable._canReadSubset) {
        newTypeVariable.canReadSubset = this.variable.canReadSubset._cloneWithResolutions(variableMap);
      }
      if (this.variable._canWriteSuperset) {
        newTypeVariable.canWriteSuperset = this.variable.canWriteSuperset._cloneWithResolutions(variableMap);
      }
      if (this.variable._originalCanReadSubset) {
        newTypeVariable._originalCanReadSubset = this.variable._originalCanReadSubset._cloneWithResolutions(variableMap);
      }
      if (this.variable._originalCanWriteSuperset) {
        newTypeVariable._originalCanWriteSuperset = this.variable._originalCanWriteSuperset._cloneWithResolutions(variableMap);
      }
      variableMap.set(this.variable, newTypeVariable);
      return new TypeVariable(newTypeVariable);
    }
  }

  toLiteral(): TypeLiteral {
    return this.variable.resolution ? this.variable.resolution.toLiteral()
                                    : {tag: this.tag, data: this.variable.toLiteral()};
  }

  toString(options = undefined) {
    return `~${this.variable.name}`;
  }

  getEntitySchema(): Schema {
    return this.variable.isResolved() ? this.resolvedType().getEntitySchema() : null;
  }

  toPrettyString(): string {
    return this.variable.isResolved() ? this.resolvedType().toPrettyString() : `[~${this.variable.name}]`;
  }

  restrictTypeRanges(type: Type): Type {
    assert(this.tag === type.tag);
    const typeVar = this.variable.restrictTypeRanges((type as TypeVariable).variable);
    if (!typeVar) {
      throw new Error(`Cannot restrict type ranges of ${this.toPrettyString()} and ${type.toPrettyString()}`);
    }
    return new TypeVariable(typeVar);
  }
}

export class CollectionType<T extends Type> extends Type {
  readonly collectionType: T;
  static handleClass = null;

  constructor(collectionType: T) {
    super('Collection');
    this.collectionType = collectionType;
  }

  get isCollection(): boolean {
    return true;
  }

  _isAtLeastAsSpecificAs(type: CollectionType<T>): boolean {
    return this.getContainedType().isAtLeastAsSpecificAs(type.getContainedType());
  }

  mergeTypeVariablesByName(variableMap: Map<string, Type>): CollectionType<Type> {
    const collectionType = this.collectionType;
    const result = collectionType.mergeTypeVariablesByName(variableMap);
    return (result === collectionType) ? this : result.collectionOf();
  }

  _applyExistenceTypeTest(test: Predicate<Type>): boolean {
    return this.collectionType._applyExistenceTypeTest(test);
  }

  getContainedType(): T {
    return this.collectionType;
  }

  isTypeContainer(): boolean {
    return true;
  }

  resolvedType(): CollectionType<Type> {
    const collectionType = this.collectionType;
    const resolvedCollectionType = collectionType.resolvedType();
    return (collectionType !== resolvedCollectionType) ? resolvedCollectionType.collectionOf() : this;
  }

  _canEnsureResolved(): boolean {
    return this.collectionType.canEnsureResolved();
  }

  maybeEnsureResolved(options = undefined): boolean {
    return this.collectionType.maybeEnsureResolved(options);
  }

  get canWriteSuperset(): InterfaceType {
    return InterfaceType.make(this.tag, [], []);
  }

  get canReadSubset() {
    return InterfaceType.make(this.tag, [], []);
  }

  _clone(variableMap: Map<string, Type>) {
    const data = this.collectionType.clone(variableMap).toLiteral();
    return Type.fromLiteral({tag: this.tag, data});
  }

  _cloneWithResolutions(variableMap: Map<TypeVariableInfo|Schema, TypeVariableInfo|Schema>): CollectionType<Type> {
    return new CollectionType(this.collectionType._cloneWithResolutions(variableMap));
  }

  toLiteral(): TypeLiteral {
    return {tag: this.tag, data: this.collectionType.toLiteral()};
  }

  _hasProperty(property): boolean {
    return this.collectionType.hasProperty(property);
  }

  toString(options = undefined): string {
    return `[${this.collectionType.toString(options)}]`;
  }

  getEntitySchema(): Schema {
    return this.collectionType.getEntitySchema();
  }

  toPrettyString(): string {
    const entitySchema = this.getEntitySchema();
    if (entitySchema && entitySchema.description.plural) {
      return entitySchema.description.plural;
    }
    return `${this.collectionType.toPrettyString()} List`;
  }

  crdtInstanceConstructor() {
    return CRDTCollection;
  }

  handleConstructor<T>() {
    return CollectionType.handleClass;
  }

  restrictTypeRanges(type: Type): Type {
    assert(this.tag === type.tag);
    return new CollectionType(this.getContainedType().restrictTypeRanges(type.getContainedType()));
  }
}

export class BigCollectionType<T extends Type> extends Type {
  readonly bigCollectionType: T;

  constructor(bigCollectionType: T) {
    super('BigCollection');
    this.bigCollectionType = bigCollectionType;
  }

  get isBigCollection(): boolean {
    return true;
  }

  mergeTypeVariablesByName(variableMap: Map<string, Type>): BigCollectionType<Type> {
    const collectionType = this.bigCollectionType;
    const result = collectionType.mergeTypeVariablesByName(variableMap);
    return (result === collectionType) ? this : result.bigCollectionOf();
  }

  _applyExistenceTypeTest(test): boolean {
    return this.bigCollectionType._applyExistenceTypeTest(test);
  }

  getContainedType(): T {
    return this.bigCollectionType;
  }

  isTypeContainer(): boolean {
    return true;
  }

  resolvedType(): BigCollectionType<Type> {
    const collectionType = this.bigCollectionType;
    const resolvedCollectionType = collectionType.resolvedType();
    return (collectionType !== resolvedCollectionType) ? resolvedCollectionType.bigCollectionOf() : this;
  }

  _canEnsureResolved(): boolean {
    return this.bigCollectionType.canEnsureResolved();
  }

  maybeEnsureResolved(options = undefined): boolean {
    return this.bigCollectionType.maybeEnsureResolved(options);
  }

  get canWriteSuperset(): InterfaceType {
    return InterfaceType.make(this.tag, [], []);
  }

  get canReadSubset() {
    return InterfaceType.make(this.tag, [], []);
  }

  _clone(variableMap: Map<string, Type>) {
    const data = this.bigCollectionType.clone(variableMap).toLiteral();
    return Type.fromLiteral({tag: this.tag, data});
  }

  _cloneWithResolutions(variableMap: Map<TypeVariableInfo|Schema, TypeVariableInfo|Schema>): BigCollectionType<Type> {
    return new BigCollectionType(this.bigCollectionType._cloneWithResolutions(variableMap));
  }

  toLiteral(): TypeLiteral {
    return {tag: this.tag, data: this.bigCollectionType.toLiteral()};
  }

  _hasProperty(property): boolean {
    return this.bigCollectionType.hasProperty(property);
  }

  toString(options = undefined): string {
    return `BigCollection<${this.bigCollectionType.toString(options)}>`;
  }

  getEntitySchema(): Schema {
    return this.bigCollectionType.getEntitySchema();
  }

  toPrettyString(): string {
    const entitySchema = this.getEntitySchema();
    if (entitySchema && entitySchema.description.plural) {
      return entitySchema.description.plural;
    }
    return `Collection of ${this.bigCollectionType.toPrettyString()}`;
  }

  restrictTypeRanges(type: Type): Type {
    assert(this.tag === type.tag);
    throw new Error(`'restrictTypeRanges' is not supported for ${this.tag}`);
  }
}

export class TupleType extends Type {
  readonly innerTypes: Type[];

  constructor(innerTypes: Type[]) {
    super('Tuple');
    this.innerTypes = innerTypes;
  }

  get isTuple(): boolean {
    return true;
  }

  isTypeContainer(): boolean {
    return true;
  }

  getContainedTypes(): Type[]|null {
    return this.innerTypes;
  }

  get canWriteSuperset() {
    return new TupleType(this.innerTypes.map(t => t.canWriteSuperset));
  }

  get canReadSubset() {
    return new TupleType(this.innerTypes.map(t => t.canReadSubset));
  }

  resolvedType() {
    let returnSelf = true;
    const resolvedinnerTypes = [];
    for (const t of this.innerTypes) {
      const resolved = t.resolvedType();
      if (resolved !== t) returnSelf = false;
      resolvedinnerTypes.push(resolved);
    }
    if (returnSelf) return this;
    return new TupleType(resolvedinnerTypes);
  }

  _canEnsureResolved(): boolean {
    return this.innerTypesSatisfy((type) => type.canEnsureResolved());
  }

  maybeEnsureResolved(options = undefined): boolean {
    return this.innerTypesSatisfy((type) => type.maybeEnsureResolved(options));
  }

  _isAtLeastAsSpecificAs(other: TupleType): boolean {
    if (this.innerTypes.length !== other.innerTypes.length) return false;
    return this.innerTypesSatisfy((type, idx) => type.isAtLeastAsSpecificAs(other.innerTypes[idx]));
  }

  private innerTypesSatisfy(predicate: ((type: Type, idx: number) => boolean)): boolean {
    return this.innerTypes.reduce((result: boolean, type: Type, idx: number) => result && predicate(type, idx), true);
  }

  _applyExistenceTypeTest(test: Predicate<Type>): boolean {
    return this.innerTypes.reduce((result: boolean, type: Type) => result || type._applyExistenceTypeTest(test), false);
  }

  toLiteral(): TypeLiteral {
    return {tag: this.tag, data: this.innerTypes.map(t => t.toLiteral())};
  }

  toString(options = undefined ): string {
    return `(${this.innerTypes.map(t => t.toString(options)).join(', ')})`;
  }

  toPrettyString(): string {
    return 'Tuple of ' + this.innerTypes.map(t => t.toPrettyString()).join(', ');
  }

  restrictTypeRanges(type: Type): Type {
    assert(this.tag === type.tag);
    return new TupleType(this.getContainedTypes().map((innerType, idx) =>
        innerType.restrictTypeRanges(type.getContainedTypes()[idx])));
  }

  _clone(variableMap: Map<string, Type>): TupleType {
    return new TupleType(this.innerTypes.map(t => t.clone(variableMap)));
  }

  _cloneWithResolutions(variableMap: Map<string, Type>): TupleType {
    return new TupleType(this.innerTypes.map(t => t._cloneWithResolutions(variableMap)));
  }

  mergeTypeVariablesByName(variableMap: Map<string, Type>): TupleType {
    let mergeSuccess = false;
    const results = [];
    for (const type of this.innerTypes) {
      const result = type.mergeTypeVariablesByName(variableMap);
      if (result !== type) {
        mergeSuccess = true;
      }
      results.push(result);
    }
    return mergeSuccess ? new TupleType(results) : this;
  }
}

export interface HandleConnection {
  type: Type;
  name?: string|TypeVariable;
  direction?: Direction; // TODO make required
}

// TODO(lindner) only tests use optional props
export interface Slot {
  name?: string|TypeVariable;
  direction?: SlotDirection;
  isRequired?: boolean;
  isSet?: boolean;
}

export class InterfaceType extends Type {
  readonly interfaceInfo: InterfaceInfo;

  constructor(iface: InterfaceInfo) {
    super('Interface');
    this.interfaceInfo = iface;
  }

  static make(name: string, handleConnections: HandleConnection[], slots: Slot[]) {
    return new InterfaceType(InterfaceInfo.make(name, handleConnections, slots));
  }

  get isInterface(): boolean {
    return true;
  }

  mergeTypeVariablesByName(variableMap: Map<string, Type>) {
    const interfaceInfo = this.interfaceInfo.clone(new Map());
    interfaceInfo.mergeTypeVariablesByName(variableMap);
    // TODO: only build a new type when a variable is modified
    return new InterfaceType(interfaceInfo);
  }

  _applyExistenceTypeTest(test) {
    return this.interfaceInfo._applyExistenceTypeTest(test);
  }

  resolvedType() {
    return new InterfaceType(this.interfaceInfo.resolvedType());
  }

  _canEnsureResolved(): boolean {
    return this.interfaceInfo.canEnsureResolved();
  }

  maybeEnsureResolved(options = undefined): boolean {
    return this.interfaceInfo.maybeEnsureResolved();
  }

  get canWriteSuperset(): InterfaceType {
    return new InterfaceType(this.interfaceInfo.canWriteSuperset);
  }

  get canReadSubset() {
    return new InterfaceType(this.interfaceInfo.canReadSubset);
  }

  _isAtLeastAsSpecificAs(type: InterfaceType) {
    return this.interfaceInfo.isAtLeastAsSpecificAs(type.interfaceInfo);
  }

  _clone(variableMap: Map<string, Type>) {
    const data = this.interfaceInfo.clone(variableMap).toLiteral();
    return Type.fromLiteral({tag: this.tag, data});
  }

  _cloneWithResolutions(variableMap): InterfaceType {
    return new InterfaceType(this.interfaceInfo.cloneWithResolutions(variableMap));
  }

  toLiteral(): TypeLiteral {
    return {tag: this.tag, data: this.interfaceInfo.toLiteral()};
  }

  toString(options = undefined): string {
    return this.interfaceInfo.name;
  }

  toPrettyString(): string {
    return this.interfaceInfo.toPrettyString();
  }

  restrictTypeRanges(type: Type): Type {
    assert(this.tag === type.tag);
    throw new Error(`'restrictTypeRanges' is not supported for ${this.tag}`);
  }
}


export class SlotType extends Type {
  private readonly slot: SlotInfo;

  constructor(slot: SlotInfo) {
    super('Slot');
    this.slot = slot;
  }

  static make(formFactor: string, handle: string) {
    return new SlotType(new SlotInfo(formFactor, handle));
  }

  getSlot(): SlotInfo {
    return this.slot;
  }

  get canWriteSuperset(): SlotType {
    return this;
  }

  get canReadSubset() {
    return this;
  }

  _isAtLeastAsSpecificAs(type: SlotType) {
    // TODO: formFactor checking, etc.
    return true;
  }

  toLiteral(): TypeLiteral {
    return {tag: this.tag, data: this.slot.toLiteral()};
  }

  toString(options = undefined): string {
    const fields: string[] = [];
    for (const key of Object.keys(this.slot)) {
      if (this.slot[key] !== undefined) {
        fields.push(`${key}:${this.slot[key]}`);
      }
    }
    let fieldsString = '';
    if (fields.length !== 0) {
      fieldsString = ` {${fields.join(', ')}}`;
    }
    return `Slot${fieldsString}`;
  }

  toPrettyString(): string {
    const fields: string[] = [];
    for (const key of Object.keys(this.slot)) {
      if (this.slot[key] !== undefined) {
        fields.push(`${key}:${this.slot[key]}`);
      }
    }
    let fieldsString = '';
    if (fields.length !== 0) {
      fieldsString = ` {${fields.join(', ')}}`;
    }
    return `Slot${fieldsString}`;
  }

  restrictTypeRanges(type: Type): Type {
    assert(this.tag === type.tag);
    throw new Error(`'restrictTypeRanges' is not supported for ${this.tag}`);
  }
}


export class ReferenceType<T extends Type> extends Type {
  readonly referredType: T;

  constructor(reference: T) {
    super('Reference');
    if (reference == null) {
      throw new Error('invalid type! Reference types must include a referenced type declaration');
    }
    this.referredType = reference;
  }

  get isReference(): boolean {
    return true;
  }

  getContainedType(): T {
    return this.referredType;
  }

  isTypeContainer(): boolean {
    return true;
  }

  resolvedType() {
    const referredType = this.referredType;
    const resolvedReferredType = referredType.resolvedType();
    return (referredType !== resolvedReferredType) ? new ReferenceType(resolvedReferredType) : this;
  }

  _isAtLeastAsSpecificAs(type: ReferenceType<T>): boolean {
    return this.getContainedType().isAtLeastAsSpecificAs(type.getContainedType());
  }

  _canEnsureResolved(): boolean {
    return this.referredType.canEnsureResolved();
  }

  maybeEnsureResolved(options = undefined): boolean {
    return this.referredType.maybeEnsureResolved(options);
  }

  get canWriteSuperset() {
    // TODO(cypher1): Possibly cannot write to references.
    return this.referredType.canWriteSuperset;
  }

  get canReadSubset() {
    return this.referredType.canReadSubset;
  }

  _clone(variableMap: Map<string, Type>) {
    const data = this.referredType.clone(variableMap).toLiteral();
    return Type.fromLiteral({tag: this.tag, data});
  }

  _cloneWithResolutions(variableMap: Map<TypeVariableInfo|Schema, TypeVariableInfo|Schema>): ReferenceType<T> {
    return new ReferenceType<T>(this.referredType._cloneWithResolutions(variableMap) as T);
  }

  _applyExistenceTypeTest(test: Predicate<Type>): boolean {
    return this.referredType._applyExistenceTypeTest(test);
  }

  toLiteral(): TypeLiteral {
    return {tag: this.tag, data: this.referredType.toLiteral()};
  }

  toString(options = undefined): string {
    return '&' + this.referredType.toString();
  }

  toPrettyString(): string {
    return 'Reference to ' + this.referredType.toPrettyString();
  }

  getEntitySchema(): Schema {
    return this.referredType.getEntitySchema();
  }

  crdtInstanceConstructor<T extends CRDTTypeRecord>(): new () => CRDTModel<T> {
    return this.referredType.crdtInstanceConstructor();
  }

  restrictTypeRanges(type: Type): Type {
    assert(this.tag === type.tag);
    return new ReferenceType(this.getContainedType().restrictTypeRanges(type.getContainedType()));
  }

  mergeTypeVariablesByName(variableMap: Map<string, Type>) {
    const referredType = this.referredType;
    const result = referredType.mergeTypeVariablesByName(variableMap);
    return (result === referredType) ? this : result.referenceTo();
  }
}

export class MuxType<T extends Type> extends Type {
  readonly innerType: T;
  static handleClass = null;

  constructor(type: T) {
    super('Mux');
    if (type == null) {
      throw new Error('invalid type! Mux types must include an inner type declaration');
    }
    this.innerType = type;
  }

  get isMux(): boolean {
    return true;
  }

  getContainedType(): T {
    return this.innerType;
  }

  isTypeContainer(): boolean {
    return true;
  }

  resolvedType() {
    const innerType = this.innerType;
    const resolvedInnerType = innerType.resolvedType();
    return (innerType !== resolvedInnerType) ? new MuxType(resolvedInnerType) : this;
  }

  _canEnsureResolved(): boolean {
    return this.innerType.canEnsureResolved();
  }

  maybeEnsureResolved(options = undefined): boolean {
    return this.innerType.maybeEnsureResolved(options);
  }

  get canWriteSuperset() {
    return this.innerType.canWriteSuperset;
  }

  get canReadSubset() {
    return this.innerType.canReadSubset;
  }

  _clone(variableMap: Map<string, Type>) {
    const data = this.innerType.clone(variableMap).toLiteral();
    return Type.fromLiteral({tag: this.tag, data});
  }

  _cloneWithResolutions(variableMap: Map<TypeVariableInfo|Schema, TypeVariableInfo|Schema>): MuxType<T> {
    return new MuxType<T>(this.innerType._cloneWithResolutions(variableMap) as T);
  }

  toLiteral(): TypeLiteral {
    return {tag: this.tag, data: this.innerType.toLiteral()};
  }

  toString(options = undefined): string {
    return '#' + this.innerType.toString();
  }

  toPrettyString(): string {
    return 'Mux Type of ' + this.innerType.toPrettyString();
  }

  getEntitySchema(): Schema {
    return this.innerType.getEntitySchema();
  }

  crdtInstanceConstructor<T extends CRDTTypeRecord>(): new () => CRDTModel<T> {
    return this.innerType.crdtInstanceConstructor();
  }

  handleConstructor<T>() {
    return MuxType.handleClass;
  }

  restrictTypeRanges(type: Type): Type {
    assert(this.tag === type.tag);
    throw new MuxType(this.getContainedType().restrictTypeRanges(type.getContainedType()));
  }

  mergeTypeVariablesByName(variableMap: Map<string, Type>) {
    const innerType = this.innerType;
    const result = innerType.mergeTypeVariablesByName(variableMap);
    return (result === innerType) ? this : result.muxTypeOf();
  }
}

export class HandleType extends Type {
  constructor() {
    super('Handle');
  }

  get isHandle(): boolean {
    return true;
  }

  toLiteral(): TypeLiteral {
    return {tag: this.tag};
  }

  restrictTypeRanges(type: Type): Type {
    assert(this.tag === type.tag);
    throw new Error(`'restrictTypeRanges' is not supported for ${this.tag}`);
  }
}

interface TypeVariableInfoLiteral {
  name: string;
  canWriteSuperset?: TypeLiteral;
  canReadSubset?: TypeLiteral;
  resolveToMaxType: boolean;
}

export class TypeVariableInfo {
  name: string;
  _canWriteSuperset?: Type|null;
  _canReadSubset?: Type|null;
  _resolution?: Type|null;
  // Note: original types are needed, because type variable resolution destroys
  // the range values, and this shouldn't be happening.
  _originalCanWriteSuperset?: Type|null;
  _originalCanReadSubset?: Type|null;
  resolveToMaxType: boolean;

  constructor(name: string, canWriteSuperset?: Type, canReadSubset?: Type, resolveToMaxType: boolean = false) {
    this.name = name;
    this._canWriteSuperset = canWriteSuperset;
    this._canReadSubset = canReadSubset;
    this._resolution = null;
    this.resolveToMaxType = resolveToMaxType;
  }

  isAtLeastAsSpecificAs(other: TypeVariableInfo): boolean {
    // TODO(mmandlis): add tests for this method!!!
    const thisCanReadSubset = this._canReadSubset || this._originalCanReadSubset;
    const thisCanWriteSuperset = this._canWriteSuperset || this._originalCanWriteSuperset;
    const otherCanReadSubset = other._canReadSubset || other._originalCanReadSubset;
    const otherCanWriteSuperset = other._canWriteSuperset || other._originalCanWriteSuperset;
    return ((!otherCanWriteSuperset && !thisCanWriteSuperset) ||
            (otherCanWriteSuperset && (!thisCanWriteSuperset || otherCanWriteSuperset.isAtLeastAsSpecificAs(thisCanWriteSuperset)))) &&
          ((!thisCanReadSubset && !otherCanReadSubset) ||
            !thisCanReadSubset || thisCanReadSubset.isAtLeastAsSpecificAs(otherCanReadSubset));
  }

  /**
   * Merge both the read subset (upper bound) and write superset (lower bound) constraints
   * of two variables together. Use this when two separate type variables need to resolve
   * to the same value.
   */
  maybeMergeConstraints(variable: TypeVariableInfo): boolean {
    if (!this.maybeMergeCanReadSubset(variable.canReadSubset)) {
      return false;
    }
    return this.maybeMergeCanWriteSuperset(variable.canWriteSuperset);
  }

  /**
   * Merge a type variable's read subset (upper bound) constraints into this variable.
   * This is used to accumulate read constraints when resolving a handle's type.
   */
  maybeMergeCanReadSubset(constraint: Type): boolean {
    const {result, success} = this._maybeMerge(
      this.canReadSubset,
      constraint,
      Schema.intersect
    );
    this.canReadSubset = result;
    return success;
  }

  /**
   * merge a type variable's write superset (lower bound) constraints into this variable.
   * This is used to accumulate write constraints when resolving a handle's type.
   */
  maybeMergeCanWriteSuperset(constraint: Type): boolean {
    const {result, success} = this._maybeMerge(this.canWriteSuperset, constraint, Schema.union);
    this.canWriteSuperset = result;
    return success;
  }

  // Helper to generalize canReadSubset and canWriteSuperset merging
  private _maybeMerge(target: Type, constraint: Type,
                      merger: (left: Schema, right: Schema) => Schema): { success: boolean; result: Type } {
    if (constraint == null) {
      return {success: true, result: target};
    }

    if (target == null) {
      return {success: true, result: constraint};
    }

    if (target instanceof SlotType && constraint instanceof SlotType) {
      // TODO: formFactor compatibility, etc.
      return {success: true, result: target};
    }

    if (target instanceof EntityType && constraint instanceof EntityType) {
      const mergedSchema = merger(target.entitySchema, constraint.entitySchema);
      if (!mergedSchema) {
        return {success: false, result: target};
      }

      return {success: true, result: new EntityType(mergedSchema)};
    }

    return {success: false, result: target};
  }

  isSatisfiedBy(type: Type): boolean {
    const constraint = this._canWriteSuperset;
    if (!constraint) {
      return true;
    }
    if (!(constraint instanceof EntityType) || !(type instanceof EntityType)) {
      throw new Error(`constraint checking not implemented for ${this} and ${type}`);
    }
    return type.getEntitySchema().isAtLeastAsSpecificAs(constraint.getEntitySchema());
  }

  get resolution(): Type|null {
    if (this._resolution) {
      return this._resolution.resolvedType();
    }
    return null;
  }

  isValidResolutionCandidate(value: Type): {result: boolean, detail?: string} {
    const elementType = value.resolvedType().getContainedType();
    if (elementType instanceof TypeVariable && elementType.variable === this) {
      return {result: false, detail: 'variable cannot resolve to collection of itself'};
    }
    return {result: true};
  }

  set resolution(value: Type) {
    assert(!this._resolution);

    const isValid = this.isValidResolutionCandidate(value);
    assert(isValid.result, isValid.detail);

    let probe = value;
    while (probe) {
      if (!(probe instanceof TypeVariable)) {
        break;
      }
      if (this.resolveToMaxType) {
        probe.variable.resolveToMaxType = true;
      }
      if (probe.variable === this) {
        return;
      }
      probe = probe.variable.resolution;
    }

    this._resolution = value;
    this._originalCanWriteSuperset = this._canWriteSuperset;
    this._canWriteSuperset = null;
    this._originalCanReadSubset = this._canReadSubset;
    this._canReadSubset = null;
  }

  get canWriteSuperset(): Type | null {
    if (this._resolution) {
      assert(!this._canWriteSuperset);
      if (this._resolution instanceof TypeVariable) {
        return this._resolution.variable.canWriteSuperset;
      }
      return null;
    }
    return this._canWriteSuperset;
  }

  set canWriteSuperset(value: Type|null) {
    assert(!this._resolution);
    this._canWriteSuperset = value;
  }

  get canReadSubset(): Type | null {
    if (this._resolution) {
      assert(!this._canReadSubset);
      if (this._resolution instanceof TypeVariable) {
        return this._resolution.variable.canReadSubset;
      }
      return null;
    }
    return this._canReadSubset;
  }

  set canReadSubset(value: Type|null) {
    assert(!this._resolution);
    this._canReadSubset = value;
  }

  get hasConstraint() {
    return this._canReadSubset !== null || this._canWriteSuperset !== null;
  }

  canEnsureResolved() {
    if (this._resolution) {
      return this._resolution.canEnsureResolved();
    }
    if (this._canWriteSuperset || this._canReadSubset) {
      return true;
    }
    return false;
  }

  maybeEnsureResolved(options = undefined) {
    if (this._resolution) {
      return this._resolution.maybeEnsureResolved(options);
    }
    if (this.resolveToMaxType && this._canReadSubset) {
      this.resolution = this._canReadSubset;
      return true;
    }
    if (this._canWriteSuperset) {
      this.resolution = this._canWriteSuperset;
      return true;
    }
    if (options && options.restrictToMinBound) {
      const entitySchema = this._canReadSubset
          ? this._canReadSubset.getEntitySchema() : null;
      this.resolution = new EntityType(new Schema(
          entitySchema ? entitySchema.names : [], {}, entitySchema || {}));
      return true;
    }
    if (this._canReadSubset) {
      this.resolution = this._canReadSubset;
      return true;
    }
    return false;
  }

  toLiteral() {
    assert(this.resolution == null);
    return this.toLiteralIgnoringResolutions();
  }

  toLiteralIgnoringResolutions(): TypeVariableInfoLiteral {
    return {
      name: this.name,
      canWriteSuperset: this._canWriteSuperset && this._canWriteSuperset.toLiteral(),
      canReadSubset: this._canReadSubset && this._canReadSubset.toLiteral(),
      resolveToMaxType: this.resolveToMaxType
    };
  }

  static fromLiteral(data: TypeVariableInfoLiteral) {
    return new TypeVariableInfo(
        data.name,
        data.canWriteSuperset ? Type.fromLiteral(data.canWriteSuperset) : null,
        data.canReadSubset ? Type.fromLiteral(data.canReadSubset) : null,
        data.resolveToMaxType
    );
  }

  isResolved(): boolean {
    return this._resolution && this._resolution.isResolved();
  }

  // TODO(mmandlis): add tests before submitting.
  restrictTypeRanges(other: TypeVariableInfo): TypeVariableInfo {
    const thisCanWriteSuperset = this.canWriteSuperset || this._originalCanWriteSuperset;
    const otherCanWriteSuperset = other.canWriteSuperset || other._originalCanWriteSuperset;
    let newCanWriteSuperset = thisCanWriteSuperset || otherCanWriteSuperset;
    if (thisCanWriteSuperset && otherCanWriteSuperset) {
      const unionSchema = Schema.union(
          thisCanWriteSuperset.getEntitySchema(), otherCanWriteSuperset.getEntitySchema());
      if (!unionSchema) {
        throw new Error(`Cannot union schema: ${thisCanWriteSuperset.getEntitySchema()} and ${otherCanWriteSuperset.getEntitySchema()}`);
      }
      newCanWriteSuperset = new EntityType(unionSchema);
    }
    const thisCanReadSubset = this.canReadSubset || this._originalCanReadSubset;
    const otherCanReadSubset = other.canReadSubset || other._originalCanReadSubset;
    let newCanReadSubset = thisCanReadSubset || otherCanReadSubset;
    if (thisCanReadSubset && otherCanReadSubset) {
      newCanReadSubset = new EntityType(Schema.intersect(
          thisCanReadSubset.getEntitySchema(), otherCanReadSubset.getEntitySchema()));
    }
    return new TypeVariableInfo(this.name, newCanWriteSuperset, newCanReadSubset, this.resolveToMaxType);
  }
}

// The interface for InterfaceInfo must live here to avoid circular dependencies.
export interface HandleConnectionLiteral {
  type?: TypeLiteral;
  name?: string|TypeLiteral;
  direction?: Direction;
}

export interface SlotLiteral {
  name?: string|TypeLiteral;
  direction?: SlotDirection;
  isRequired?: boolean;
  isSet?: boolean;
}

export interface TypeVarReference {
  object: HandleConnection|Slot;
  field: string;
}

export interface InterfaceInfoLiteral {
  name: string;
  handleConnections: HandleConnectionLiteral[];
  slots: SlotLiteral[];
}

export type MatchResult = {var: TypeVariable, value: Type, direction: Direction};

type Maker = (name: string, handleConnections: HandleConnection[], slots: Slot[]) => InterfaceInfo;
type HandleConnectionMatcher = (interfaceHandleConnection: HandleConnection, particleHandleConnection: HandleConnection) => boolean|MatchResult[];
type Deliteralizer = (data: InterfaceInfoLiteral) => InterfaceInfo;
type SlotMatcher = (interfaceSlot: Slot, particleSlot: Slot) => boolean;

export abstract class InterfaceInfo {
  name: string;
  handleConnections: HandleConnection[];
  slots: Slot[];

  // TODO(lindner) only accessed in tests
  public readonly typeVars: TypeVarReference[];

  constructor(name: string, handleConnections: HandleConnection[], slots: Slot[]) {
    assert(name);
    assert(handleConnections !== undefined);
    assert(slots !== undefined);
    this.name = name;
    this.handleConnections = handleConnections;
    this.slots = slots;
    this.typeVars = [];
  }

  toPrettyString(): string {
    return 'InterfaceInfo';
  }

  mergeTypeVariablesByName(variableMap: Map<string, Type>) {
    this.typeVars.forEach(({object, field}) => object[field] = (object[field] as Type).mergeTypeVariablesByName(variableMap));
  }

  abstract readonly canReadSubset : InterfaceInfo;

  abstract readonly  canWriteSuperset : InterfaceInfo;

  abstract isAtLeastAsSpecificAs(other: InterfaceInfo) : boolean;

  abstract _applyExistenceTypeTest(test: Predicate<TypeVarReference>) : boolean;

  abstract toManifestString(builder?: IndentingStringBuilder) : string;

  static make : Maker = null;

  static fromLiteral : Deliteralizer = null;

  abstract toLiteral(): InterfaceInfoLiteral;

  abstract clone(variableMap: Map<string, Type>) : InterfaceInfo;

  abstract cloneWithResolutions(variableMap: Map<string, Type>) : InterfaceInfo;

  abstract canEnsureResolved() : boolean;

  abstract maybeEnsureResolved() : boolean;

  abstract tryMergeTypeVariablesWith(other: InterfaceInfo) : InterfaceInfo;

  abstract resolvedType() : InterfaceInfo;

  abstract equals(other: InterfaceInfo) : boolean;

  static _updateTypeVar(typeVar: TypeVarReference, update: (t: Type) => Type): void {
    typeVar.object[typeVar.field] = update(typeVar.object[typeVar.field]);
  }

  static isTypeVar(reference: TypeVariable | Type | string | boolean): boolean {
    return reference instanceof TypeVariable || reference instanceof Type && reference.hasVariable;
  }

  static mustMatch(reference: TypeVariable | Type | string | boolean): boolean {
    return !(reference == undefined || InterfaceInfo.isTypeVar(reference));
  }

  static handleConnectionsMatch : HandleConnectionMatcher = null;

  static slotsMatch : SlotMatcher = null;

  abstract particleMatches(particleSpec: ParticleSpec): boolean;

  abstract restrictType(particleSpec: ParticleSpec): boolean;
}

