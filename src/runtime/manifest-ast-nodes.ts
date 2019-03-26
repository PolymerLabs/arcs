/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

/**
 * Complete set of tokens used by `manifest-parser.peg`. To use this you
 * need to follow some simple guidelines:
 *
 * - Most interfaces should extend `BaseToken`
 * - When returning data add `as Token.NewTypeName` to validate your return types.
 *
 * You may need to check the generated output in runtime/ts/manifest-parser.ts to validate.
 */

// duplicate of definition from pegjs code to avoid circular dependencies
interface SourcePosition {
  offset: number;
  line: number;
  column: number;
}

// duplicate of definition from pegjs code to avoid circular dependencies
interface SourceLocation {
  filename?: string;
  start: SourcePosition;
  end: SourcePosition;
}

/**
 * A base token interface for the `kind` and `location` entries. This creates
 * a TypeScript Discriminated Union for most tokens.
 */
interface BaseToken {
  kind: string;
  location: SourceLocation;
}

//  PARTICLE TYPES
export interface BigCollectionType extends BaseToken {
  kind: 'big-collection-type';
  type: ParticleArgumentType;
}

export interface CollectionType extends BaseToken {
  kind: 'collection-type';
  type: ParticleArgumentType;
}

export interface ReferenceType extends BaseToken {
  kind: 'reference-type';
  type: ParticleArgumentType;
}

export interface TypeVariable extends BaseToken {
  kind: 'variable-type';
  name: string;
  constraint: ParticleArgument;
}

export interface SlotType extends BaseToken {
  kind: 'slot-type';
  fields: SlotField[];
}
// END PARTICLE TYPES


export interface Description extends BaseToken {
  kind: 'description';
  name: 'pattern';
  description: Description[];
}

export interface HandleRef extends BaseToken {
  kind: 'handle-ref';
  id?: string;
  name?: string;
  tags: TagList;
}

export interface Import extends BaseToken {
  kind: 'import';
  path: string;
}

export interface ManifestStorage extends BaseToken {
  kind: 'store';
  name: string;
  type: string;
  id: string|null;
  originalId: string|null;
  version: number;
  tags: TagList;
  source: string;
  origin: string;
  description: string|null;
}

export interface ManifestStorageSource {
  origin: string;
  source: string;
}

export interface ManifestStorageFileSource extends ManifestStorageSource {
  origin: 'file';
}

export interface ManifestStorageResourceSource extends ManifestStorageSource {
  origin: 'resource';
}

export interface ManifestStorageStorageSource extends ManifestStorageSource {
  origin: 'storage';
}

export interface Meta extends BaseToken {
  kind: 'meta';
  items: (MetaName|MetaStorageKey)[];
}

export interface MetaName extends BaseToken {
  kind: 'name';
  key: string;
  value: string;
}

export interface MetaStorageKey extends BaseToken {
  key: 'storageKey';
  value: string;
  kind: 'storageKey';
}

export interface Particle extends BaseToken {
  kind: 'particle';
  name: string;
  implFile?: string;          // not used in RecipeParticle
  verbs?: VerbList;           // not used in RecipeParticle
  args?: ParticleArgument[];  // not used in RecipeParticle
  modality?: string[];      // not used in RecipePartcile
  slots?: ParticleSlot[];    // not used in RecipeParticle
  description?: Description;  // not used in RecipeParticle
  hasParticleArgument?: boolean;  // not used in RecipeParticle

  // fields in RecipeParticle only
  ref?: ParticleRef | '*';
  connections?: RecipeParticleConnection[];
  slotConnections?: RecipeParticleSlotConnection[];
}


export interface ParticleModality extends BaseToken {
  kind: 'particle-modality';
  modality: string;
}

export interface ParticleArgument extends BaseToken {
  kind: 'particle-argument';
  direction: string;
  type: ParticleArgumentType;
  isOptional: boolean;
  dependentConnections: string[];
  name: string;
  tags: TagList;
}

export type ParticleHandle = ParticleArgument;

export interface ParticleHandleDescription extends BaseToken {
  kind: 'handle-description';
  name: string;
  pattern: string;
}

export interface ParticleInterface extends BaseToken {
  kind: 'interface';
  verb: string;
  args: ParticleArgument[];
}

export interface ParticleSlot extends BaseToken {
  kind: 'particle-slot';
  name: string;
  tags: TagList;
  isRequired: boolean;
  isSet: boolean;
  formFactor: SlotFormFactor;
  provideSlotConnections: ParticleProvidedSlot[];
}

export interface ParticleProvidedSlot extends BaseToken {
  kind: 'provided-slot';
  name: string;
  tags: TagList;
  isRequired: boolean;
  isSet: boolean;
  formFactor: SlotFormFactor;
  handles: ParticleProvidedSlotHandle[];

  // RecipeParticleProvidedSlot
  param: string;
}

export interface ParticleProvidedSlotHandle extends BaseToken {
  kind: 'particle-provided-slot-handle';
  handle: string;
}

export interface ParticleRef extends BaseToken {
  kind: 'particle-ref';
  name: string;
  verbs: VerbList;
}

export interface Recipe extends BaseToken {
  kind: 'recipe';
  name: string;
  verbs: VerbList;
  items: RecipeItem[];
}

export interface RecipeParticle extends BaseToken {
  kind: 'particle';
  name: string;
  ref: ParticleRef;
  connections: RecipeParticleConnection[];
  slotConnections: RecipeParticleSlotConnection[];
}

export interface RequireHandleSection extends BaseToken {
  kind: 'requireHandle';
  name: string;
  ref: HandleRef;
}

export interface RecipeRequire extends BaseToken {
  kind: 'require';
  items: RecipeItem;
}

export type RecipeItem = RecipeParticle | RecipeHandle | RequireHandleSection | RecipeRequire | RecipeSlot | RecipeSearch | RecipeConnection | Description;

export interface RecipeParticleConnection extends BaseToken {
  kind: 'handle-connection';
  param: string;
  dir: string;
  target: ParticleConnectionTargetComponents;
}

export interface ParticleConnectionTargetComponents extends BaseToken {
  kind: 'handle-connection-components';
  name: string|null;
  particle: string|null;
  tags: TagList;
}

export interface ParticleConnnectionTargetComponents extends BaseToken {
  kind: 'hanlde-connection-components';
  name: string|null;
  particle: string|null;
  tags: TagList;
}

export interface RecipeHandle extends BaseToken {
  kind: 'handle';
  name: string|null;
  ref: string|null;
  fate: string;
}

export interface RecipeParticleSlotConnection extends BaseToken {
  kind: 'slot-connection';
  param: string;
  tags: TagList;
  name: string;
  dependentSlotConnections: RecipeParticleProvidedSlot[];
}

export interface RecipeSlotConnectionRef extends BaseToken {
  kind: 'slot-connection-ref';
  param: string;
  tags: TagList;
}

export interface RecipeParticleProvidedSlot extends BaseToken {
  kind: 'slot-connection-ref';
  param: string;
  name: string|null;
}

export interface RecipeConnection extends BaseToken {
  kind: 'connection';
  direction: string;
  from: ConnectionTarget;
  to: ConnectionTarget;
}

export interface RecipeSearch extends BaseToken {
  kind: 'search';
  phrase: string;
  tokens: string[];
}

export interface RecipeSlot extends BaseToken {
  kind: 'slot';
  ref: string|null;
  name: string|null;
}

export interface ConnectionTarget extends BaseToken {
  kind: 'connection-target';
  targetType: 'verb'|'tag'|'localName'|'particle';

  name?: string;      // Only in NameConnectionTarget
  particle?: string;  // Only in ParticleConnectionTarget

  verbs?: VerbList;
  param: string;    // from ConnectionTargetHandleComponents
  tags?: TagList;   // from ConnectionTargetHandleComponents
}

export interface VerbConnectionTarget extends BaseToken {
  targetType: 'verb';
}

export interface TagConnectionTarget extends BaseToken {
  targetType: 'tag';
}

export interface LocalNameConnectionTarget extends BaseToken {
  name: string;
  targetType: 'localName';
}

export interface ParticleConnectionTarget extends BaseToken {
  particle: string;
  targetType: 'particle';
}

export interface ConnectionTargetHandleComponents extends BaseToken {
  param: string;
  tags: TagList;
}

export interface Resource extends BaseToken {
  kind: 'resource';
  name: string;
  data: string;
}

export interface Schema extends BaseToken {
  kind: 'schema';
  items: SchemaItem[];
  alias?: string;
}

export interface SchemaSection extends BaseToken {
  kind: 'schema-section';
  sectionType: string;
  fields: SchemaField[];
}

export interface SchemaField extends BaseToken {
  kind: 'schema-field';
  type: SchemaType;
  name: string;
}

export type SchemaPrimitiveType =
    'Text'|'URL'|'Number'|'Boolean'|'Bytes'|'Object';

export type SchemaType = SchemaReferenceType|SchemaCollectionType|
    SchemaPrimitiveType|SchemaUnionType|SchemaTupleType;

export interface SchemaCollectionType extends BaseToken {
  kind: 'schema-collection';
  schema: SchemaType;
}

export interface SchemaReferenceType extends BaseToken {
  kind: 'schema-reference';
  schema: SchemaType;
}

export interface SchemaUnionType extends BaseToken {
  kind: 'schema-union';
  types: string[];
}

export interface SchemaTupleType extends BaseToken {
  kind: 'schema-tuple';
  types: string[];
}

export interface SchemaInline extends BaseToken {
  kind: 'schema-inline';
  names: string[];
  fields: SchemaInlineField[];
}

export interface SchemaInlineField extends BaseToken {
  kind: 'schema-inline-field';
  name: string;
  type: SchemaType;
}

export interface SchemaSpec extends BaseToken {
  names: string[];
  parents: string[];
}

export type SchemaItem = SchemaField | Description;

export interface SchemaAlias extends BaseToken {
  kind: 'schema';
  items: SchemaItem[];
  alias: string;
}

export interface Interface extends BaseToken {
  kind: 'interface';
  name: string;
  slots: InterfaceSlot[];

  interface?: InterfaceInterface[];
  args?: InterfaceArgument[];
}

export type InterfaceItem = Interface | InterfaceArgument | InterfaceSlot;

export interface InterfaceArgument extends BaseToken {
  kind: 'interface-argument';
  direction: string;
  type: string;
  name: string;
}

export interface InterfaceInterface extends BaseToken {
  kind: 'interface';
  verb: string;
  args: InterfaceArgument[];  // InterfaceArgumentList?
}

export interface InterfaceSlot extends BaseToken {
  kind: 'interface-slot';
  name: string|null;
  isRequired: boolean;
  direction: string;
  isSet: boolean;
}

export interface SlotField extends BaseToken {
  kind: 'slot-field';
  name: string;
  value: string;
}

export interface SlotFormFactor extends BaseToken {
  kind: 'form-factor';
  formFactor: string;
}

export interface TypeName extends BaseToken {
  kind: 'type-name';
  name: string;
}

export interface NameAndTagList {
  name: string;
  tags: TagList;
}

// Aliases to simplify ts-pegjs returnTypes requirement in sigh.
export type Annotation = string;
export type Direction = string;
export type LocalName = string;
export type Manifest = ManifestStorageItem[];
export type ManifestStorageItem = string;
export type ParticleArgumentDirection = string;
export type ResourceStart = string;
export type ResourceBody = string;
export type ResourceLine = string;
export type SchemaExtends = string[];
export type Tag = string;
export type TagList = Tag[];
export type TopLevelAlias = string;
export type Verb = string;
export type VerbList = Verb[];
export type Version = number;
export type backquotedString = string;
export type id = string;
export type upperIndent = string;
export type lowerIndent = string;
export type whiteSpace = string;
export type eolWhiteSpace = string;
export type eol = string;


export type ParticleArgumentType = TypeVariable|CollectionType|
    BigCollectionType|ReferenceType|SlotType|SchemaInline|TypeName;

// Note that ManifestStorage* are not here, as they do not have 'kind'
export type All = Import|Meta|MetaName|MetaStorageKey|Particle|ParticleArgument|
    ParticleInterface|RecipeHandle|Resource|Interface|InterfaceArgument|InterfaceInterface|
    InterfaceSlot;

export type ManifestItem =
    Recipe|Particle|Import|Schema|ManifestStorage|Interface|Meta|Resource;
