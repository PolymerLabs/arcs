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
import {Predicate, Literal} from './hot.js';
import {CRDTTypeRecord, CRDTModel} from './crdt/crdt.js';
import {CRDTCount} from './crdt/crdt-count.js';
import {CRDTCollection} from './crdt/crdt-collection.js';
import {CRDTSingleton} from './crdt/crdt-singleton.js';
import {Schema} from './schema.js';
import * as AstNode from './manifest-ast-nodes.js';
import {ParticleSpec} from './particle-spec.js';
import {Refinement} from './refiner.js';
import {AnnotationRef} from './recipe/annotation.js';
import {ManifestStringBuilder} from './manifest-string-builder.js';

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

  mergeTypeVariablesByName(variableMap: Map<string, Type>) : Type {
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

  maybeEnsureResolved(): boolean {
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
}

export class TypeVariable extends Type {
  readonly variable: TypeVariableInfo;

  constructor(variable: TypeVariableInfo) {
    super('TypeVariable');
    this.variable = variable;
  }

  static make(name: string, canWriteSuperset: Type = null, canReadSubset: Type = null): TypeVariable {
    return new TypeVariable(new TypeVariableInfo(name, canWriteSuperset, canReadSubset));
  }

  get isVariable(): boolean {
    return true;
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

  maybeEnsureResolved(): boolean {
    return this.variable.maybeEnsureResolved();
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

  maybeEnsureResolved(): boolean {
    return this.collectionType.maybeEnsureResolved();
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

  maybeEnsureResolved(): boolean {
    return this.bigCollectionType.maybeEnsureResolved();
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
}

export class TupleType extends Type {
  readonly innerTypes: Type[];

  constructor(tuple: Type[]) {
    super('Tuple');
    this.innerTypes = tuple;
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

  maybeEnsureResolved(): boolean {
    return this.innerTypesSatisfy((type) => type.maybeEnsureResolved());
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
}

export interface HandleConnection {
  type: Type;
  name?: string|TypeVariable;
  direction?: AstNode.Direction; // TODO make required
}

// TODO(lindner) only tests use optional props
export interface Slot {
  name?: string|TypeVariable;
  direction?: AstNode.SlotDirection;
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

  maybeEnsureResolved(): boolean {
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

  _canEnsureResolved(): boolean {
    return this.referredType.canEnsureResolved();
  }

  maybeEnsureResolved(): boolean {
    return this.referredType.maybeEnsureResolved();
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

  maybeEnsureResolved(): boolean {
    return this.innerType.maybeEnsureResolved();
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
}

interface TypeVariableInfoLiteral {
  name: string;
  canWriteSuperset?: TypeLiteral;
  canReadSubset?: TypeLiteral;
}

export class TypeVariableInfo {
  name: string;
  _canWriteSuperset?: Type|null;
  _canReadSubset?: Type|null;
  _resolution?: Type|null;

  constructor(name: string, canWriteSuperset?: Type, canReadSubset?: Type) {
    this.name = name;
    this._canWriteSuperset = canWriteSuperset;
    this._canReadSubset = canReadSubset;
    this._resolution = null;
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
    if (constraint == null) {
      return true;
    }

    if (this.canReadSubset == null) {
      this.canReadSubset = constraint;
      return true;
    }

    if (this.canReadSubset instanceof SlotType && constraint instanceof SlotType) {
      // TODO: formFactor compatibility, etc.
      return true;
    }
    if (this.canReadSubset instanceof EntityType && constraint instanceof EntityType) {
      const mergedSchema = Schema.intersect(this.canReadSubset.entitySchema, constraint.entitySchema);
      if (!mergedSchema) {
        return false;
      }

      this.canReadSubset = new EntityType(mergedSchema);
      return true;
    }
    return false;
  }

  /**
   * merge a type variable's write superset (lower bound) constraints into this variable.
   * This is used to accumulate write constraints when resolving a handle's type.
   */
  maybeMergeCanWriteSuperset(constraint: Type): boolean {
    if (constraint == null) {
      return true;
    }

    if (this.canWriteSuperset == null) {
      this.canWriteSuperset = constraint;
      return true;
    }

    if (this.canWriteSuperset instanceof SlotType && constraint instanceof SlotType) {
      // TODO: formFactor compatibility, etc.
      return true;
    }

    if (this.canWriteSuperset instanceof EntityType && constraint instanceof EntityType) {
      const mergedSchema = Schema.union(this.canWriteSuperset.entitySchema, constraint.entitySchema);
      if (!mergedSchema) {
        return false;
      }

      this.canWriteSuperset = new EntityType(mergedSchema);
      return true;
    }
    return false;
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
      if (probe.variable === this) {
        return;
      }
      probe = probe.variable.resolution;
    }

    this._resolution = value;
    this._canWriteSuperset = null;
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

  maybeEnsureResolved() {
    if (this._resolution) {
      return this._resolution.maybeEnsureResolved();
    }
    if (this._canWriteSuperset) {
      this.resolution = this._canWriteSuperset;
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
      canReadSubset: this._canReadSubset && this._canReadSubset.toLiteral()
    };
  }

  static fromLiteral(data: TypeVariableInfoLiteral) {
    return new TypeVariableInfo(
        data.name,
        data.canWriteSuperset ? Type.fromLiteral(data.canWriteSuperset) : null,
        data.canReadSubset ? Type.fromLiteral(data.canReadSubset) : null);
  }

  isResolved(): boolean {
    return this._resolution && this._resolution.isResolved();
  }
}

// The interface for InterfaceInfo must live here to avoid circular dependencies.
export interface HandleConnectionLiteral {
  type?: TypeLiteral;
  name?: string|TypeLiteral;
  direction?: AstNode.Direction;
}

export interface SlotLiteral {
  name?: string|TypeLiteral;
  direction?: AstNode.SlotDirection;
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

export type MatchResult = {var: TypeVariable, value: Type, direction: AstNode.Direction};

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

  abstract toManifestString(builder?: ManifestStringBuilder) : string;

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

