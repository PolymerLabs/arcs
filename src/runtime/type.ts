/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Dictionary} from './hot.js';
import {EntityClass, Entity} from './entity.js';
import {Id} from './id.js';
import {InterfaceInfo, HandleConnection, Slot} from './interface-info.js';
import {SlotInfo} from './slot-info.js';
import {ArcInfo} from './synthetic-types.js';
import {TypeVariableInfo} from './type-variable-info.js';
import {Predicate, Literal} from './hot.js';
import {CRDTTypeRecord, CRDTModel} from './crdt/crdt.js';
import {CRDTCount} from './crdt/crdt-count.js';
import {CRDTCollection} from './crdt/crdt-collection.js';
import {CRDTSingleton} from './crdt/crdt-singleton.js';
import {CRDTEntity, SingletonEntityModel, CollectionEntityModel} from './crdt/crdt-entity.js';
import {CollectionHandle, SingletonHandle, Handle} from './storageNG/handle.js';
import {ParticleExecutionContext} from './particle-execution-context.js';
import {Referenceable} from './crdt/crdt-collection.js';
import {Flags} from './flags.js';

export class Schema {
  readonly names: string[];
  // tslint:disable-next-line: no-any
  readonly fields: Dictionary<any>;
  description: Dictionary<string> = {};
  isAlias: boolean;

  // For convenience, primitive field types can be specified as {name: 'Type'}
  // in `fields`; the constructor will convert these to the correct schema form.
  // tslint:disable-next-line: no-any
  constructor(names: string[], fields: Dictionary<any>, description?) {
    this.names = names;
    this.fields = {};
    for (const [name, field] of Object.entries(fields)) {
      if (typeof(field) === 'string') {
        this.fields[name] = {kind: 'schema-primitive', type: field};
      } else {
        this.fields[name] = field;
      }
    }
    if (description) {
      description.description.forEach(desc => this.description[desc.name] = desc.pattern || desc.patterns[0]);
    }
  }

  toLiteral() {
    const fields = {};
    const updateField = field => {
      if (field.kind === 'schema-reference') {
        const schema = field.schema;
        return {kind: 'schema-reference', schema: {kind: schema.kind, model: schema.model.toLiteral()}};
      } else if (field.kind === 'schema-collection') {
        return {kind: 'schema-collection', schema: updateField(field.schema)};
      } else {
        return field;
      }
    };
    for (const key of Object.keys(this.fields)) {
      fields[key] = updateField(this.fields[key]);
    }

    return {names: this.names, fields, description: this.description};
  }

  static fromLiteral(data = {fields: {}, names: [], description: {}}) {
    const fields = {};
    const updateField = field => {
      if (field.kind === 'schema-reference') {
        const schema = field.schema;
        return {kind: 'schema-reference', schema: {kind: schema.kind, model: Type.fromLiteral(schema.model)}};
      } else if (field.kind === 'schema-collection') {
        return {kind: 'schema-collection', schema: updateField(field.schema)};
      } else {
        return field;
      }
    };
    for (const key of Object.keys(data.fields)) {
      fields[key] = updateField(data.fields[key]);
    }

    const result = new Schema(data.names, fields);
    result.description = data.description || {};
    return result;
  }

  // TODO(cypher1): This should only be an ident used in manifest parsing.
  get name() {
    return this.names[0];
  }

  static typesEqual(fieldType1, fieldType2): boolean {
    // TODO(cypher1): structural check instead of stringification.
    return Schema._typeString(fieldType1) === Schema._typeString(fieldType2);
  }

  static _typeString(type): string {
    switch (type.kind) {
      case 'schema-primitive':
        return type.type;
      case 'schema-union':
        return `(${type.types.map(t => t.type).join(' or ')})`;
      case 'schema-tuple':
        return `(${type.types.map(t => t.type).join(', ')})`;
      case 'schema-reference':
        return `Reference<${Schema._typeString(type.schema)}>`;
      case 'type-name':
      case 'schema-inline':
        return type.model.entitySchema.toInlineSchemaString();
      case 'schema-collection':
        return `[${Schema._typeString(type.schema)}]`;
      default:
        throw new Error(`Unknown type kind ${type.kind} in schema ${this.name}`);
    }
  }

  static union(schema1: Schema, schema2: Schema): Schema|null {
    const names = [...new Set([...schema1.names, ...schema2.names])];
    const fields = {};

    for (const [field, type] of [...Object.entries(schema1.fields), ...Object.entries(schema2.fields)]) {
      if (fields[field]) {
        if (!Schema.typesEqual(fields[field], type)) {
          return null;
        }
      } else {
        fields[field] = type;
      }
    }

    return new Schema(names, fields);
  }

  static intersect(schema1: Schema, schema2: Schema): Schema {
    const names = [...schema1.names].filter(name => schema2.names.includes(name));
    const fields = {};

    for (const [field, type] of Object.entries(schema1.fields)) {
      const otherType = schema2.fields[field];
      if (otherType && Schema.typesEqual(type, otherType)) {
        fields[field] = type;
      }
    }

    return new Schema(names, fields);
  }

  equals(otherSchema: Schema): boolean {
    // TODO(cypher1): Check equality without calling contains.
    return this === otherSchema || (this.name === otherSchema.name
       && this.isMoreSpecificThan(otherSchema)
       && otherSchema.isMoreSpecificThan(this));
  }

  isMoreSpecificThan(otherSchema: Schema): boolean {
    const names = new Set(this.names);
    for (const name of otherSchema.names) {
      if (!names.has(name)) {
        return false;
      }
    }
    const fields = {};
    for (const [name, type] of Object.entries(this.fields)) {
      fields[name] = type;
    }
    for (const [name, type] of Object.entries(otherSchema.fields)) {
      if (fields[name] == undefined) {
        return false;
      }
      if (!Schema.typesEqual(fields[name], type)) {
        return false;
      }
    }
    return true;
  }

  get type(): Type {
    return new EntityType(this);
  }

  entityClass(context: ParticleExecutionContext|null = null): EntityClass {
    return Entity.createEntityClass(this, context);
  }

  crdtConstructor<S extends Dictionary<Referenceable>, C extends Dictionary<Referenceable>>() {
    const singletons = {};
    const collections = {};
    // TODO(shans) do this properly
    for (const [field, {type}] of Object.entries(this.fields)) {
      if (type === 'Text') {
        singletons[field] = new CRDTSingleton<{id: string}>();
      } else if (type === 'Number') {
        singletons[field] = new CRDTSingleton<{id: string, value: number}>();
      } else {
        throw new Error(`Big Scary Exception: entity field ${field} of type ${type} doesn't yet have a CRDT mapping implemented`);
      }
    }
    return class EntityCRDT extends CRDTEntity<S, C> {
      constructor() {
        super(singletons as SingletonEntityModel<S>, collections as CollectionEntityModel<C>);
      }
    };
  }

  // TODO(jopra): Enforce that 'type' of a field is a Type.
  // tslint:disable-next-line: no-any
  static fieldToString([name, type]: [string, any]) {
    const typeStr = Schema._typeString(type);
    if (Flags.defaultToPreSlandlesSyntax) {
      return `${typeStr} ${name}`;
    }
    return `${name}: ${typeStr}`;
  }

  toInlineSchemaString(options?: {hideFields?: boolean}): string {
    const names = this.names.join(' ') || '*';
    const fields = Object.entries(this.fields).map(Schema.fieldToString).join(', ');
    return `${names} {${fields.length > 0 && options && options.hideFields ? '...' : fields}}`;
  }

  toManifestString(): string {
    const results:string[] = [];
    results.push(`schema ${this.names.join(' ')}`);
    results.push(...Object.entries(this.fields).map(f => `  ${Schema.fieldToString(f)}`));
    if (Object.keys(this.description).length > 0) {
      results.push(`  description \`${this.description.pattern}\``);
      for (const name of Object.keys(this.description)) {
        if (name !== 'pattern') {
          results.push(`    ${name} \`${this.description[name]}\``);
        }
      }
    }
    return results.join('\n');
  }
}

export interface TypeLiteral extends Literal {
  tag: string;
  // tslint:disable-next-line: no-any
  data?: any;
}

export type Tag = 'Entity' | 'TypeVariable' | 'Collection' | 'BigCollection' | 'Relation' |
  'Interface' | 'Slot' | 'Reference' | 'Arc' | 'Handle' | 'Count' | 'Singleton';

export abstract class Type {
  tag: Tag;

  protected constructor(tag: Tag) {
    this.tag = tag;
  }

  static fromLiteral(literal: TypeLiteral) : Type {
    switch (literal.tag) {
      case 'Entity':
        return new EntityType(Schema.fromLiteral(literal.data));
      case 'TypeVariable':
        return new TypeVariable(TypeVariableInfo.fromLiteral(literal.data));
      case 'Collection':
        return new CollectionType(Type.fromLiteral(literal.data));
      case 'BigCollection':
        return new BigCollectionType(Type.fromLiteral(literal.data));
      case 'Relation':
        return new RelationType(literal.data.map(t => Type.fromLiteral(t)));
      case 'Interface':
        return new InterfaceType(InterfaceInfo.fromLiteral(literal.data));
      case 'Slot':
        return new SlotType(SlotInfo.fromLiteral(literal.data));
      case 'Reference':
        return new ReferenceType(Type.fromLiteral(literal.data));
      case 'Arc':
        return new ArcType();
      case 'Handle':
        return new HandleType();
      case 'Singleton':
        return new SingletonType(Type.fromLiteral(literal.data));
      default:
        throw new Error(`fromLiteral: unknown type ${literal}`);
    }
  }

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

  isTypeContainer(): boolean {
    return false;
  }

  get isReference(): boolean {
    return false;
  }

  get isSingleton(): boolean {
    return false;
  }


  collectionOf() {
    return new CollectionType(this);
  }

  bigCollectionOf() {
    return new BigCollectionType(this);
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

  isMoreSpecificThan(type: Type): boolean {
    return this.tag === type.tag && this._isMoreSpecificThan(type);
  }

  protected _isMoreSpecificThan(type: Type): boolean {
    throw new Error(`isMoreSpecificThan not implemented for ${this}`);
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
    return SingletonHandle;
  }

  get isSingleton(): boolean {
    return true;
  }

  toString(options = undefined): string {
    return `![${this.innerType.toString(options)}]`;
  }
}

export class EntityType extends Type {
  readonly entitySchema: Schema;

  constructor(schema: Schema) {
    super('Entity');
    this.entitySchema = schema;
  }

  static make(names: string[], fields: {}, description?): EntityType {
    return new EntityType(new Schema(names, fields, description));
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

  _isMoreSpecificThan(type: EntityType): boolean {
    return this.entitySchema.isMoreSpecificThan(type.entitySchema);
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

  static make(name: string, canWriteSuperset?: Type, canReadSubset?: Type): TypeVariable {
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
    return CollectionHandle;
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


export class RelationType extends Type {
  private readonly relationEntities: Type[];

  constructor(relation: Type[]) {
    super('Relation');
    this.relationEntities = relation;
  }

  get isRelation() {
    return true;
  }

  toLiteral(): TypeLiteral {
    return {tag: this.tag, data: this.relationEntities.map(t => t.toLiteral())};
  }

  toPrettyString(): string {
    return JSON.stringify(this.relationEntities);
  }
}


export class InterfaceType extends Type {
  readonly interfaceInfo: InterfaceInfo;

  constructor(iface: InterfaceInfo) {
    super('Interface');
    this.interfaceInfo = iface;
  }

  static make(name: string, handleConnections: HandleConnection[], slots: Slot[]) {
    return new InterfaceType(new InterfaceInfo(name, handleConnections, slots));
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

  _isMoreSpecificThan(type: InterfaceType) {
    return this.interfaceInfo.isMoreSpecificThan(type.interfaceInfo);
  }

  _clone(variableMap: Map<string, Type>) {
    const data = this.interfaceInfo.clone(variableMap).toLiteral();
    return Type.fromLiteral({tag: this.tag, data});
  }

  _cloneWithResolutions(variableMap): InterfaceType {
    return new InterfaceType(this.interfaceInfo._cloneWithResolutions(variableMap));
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

  _isMoreSpecificThan(type: SlotType) {
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


export class ReferenceType extends Type {
  readonly referredType: Type;

  constructor(reference: Type) {
    super('Reference');
    this.referredType = reference;
  }

  get isReference(): boolean {
    return true;
  }

  getContainedType(): Type {
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

  _cloneWithResolutions(variableMap: Map<TypeVariableInfo|Schema, TypeVariableInfo|Schema>): ReferenceType {
    return new ReferenceType(this.referredType._cloneWithResolutions(variableMap));
  }

  toLiteral(): TypeLiteral {
    return {tag: this.tag, data: this.referredType.toLiteral()};
  }

  toString(options = undefined): string {
    return 'Reference<' + this.referredType.toString() + '>';
  }

  toPrettyString(): string {
    return 'Reference to ' + this.referredType.toPrettyString();
  }

  getEntitySchema(): Schema {
    return this.referredType.getEntitySchema();
  }
}


export class ArcType extends Type {
  constructor() {
    super('Arc');
  }

  get isArc(): boolean {
    return true;
  }

  newInstance(arcId: Id, serialization: string): ArcInfo {
    return new ArcInfo(arcId, serialization);
  }

  toLiteral(): TypeLiteral {
    return {tag: this.tag};
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
