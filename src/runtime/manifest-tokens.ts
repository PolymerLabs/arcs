/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

// pegjs uses interfaces that start with I
// tslint:disable:interface-name
// tslint:disable:no-any

/**
 * Complete set of tokens used by `manifest-parser.peg`. To use this you
 * need to follow some simple guidelines:
 *
 * - Most interfaces should extend `BaseToken`
 * - When returning data add `as Token.NewTypeName` to validate your return types.
 * - Add an entry to tools/sigh.js to map the rule to it's output type.
 *
 * You may need to check the generated output in runtime/ts/manifest-parser.ts to validate.
 */

/**
 * A base token interface for theh `kind` and `location` entries.  This creates
 * a TypeScript Discriminated Union for most tokens.
 */
interface BaseToken {
  kind: string;
  location: IFileRange;
}

// duplicate of definition from pegjs code to avoid circular dependencies
interface IFilePosition extends BaseToken {
  offset: number;
  line: number;
  column: number;
}

// duplicate of definition from pegjs code to avoid circular dependencies
export interface IFileRange extends BaseToken {
  start: IFilePosition;
  end: IFilePosition;
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

export interface VariableType extends BaseToken {
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
  description: any[];  // TODO ugh.
}

export interface HandleRef extends BaseToken {
  kind: 'handle-ref';
  id?: string;
  name?: string;
  tags: string[];
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
  tags: string[];
  source: string;
  origin: string;
  description: string|null;
}

// TODO no location
export interface ManifestStorageSource {
  origin: string;
  source: string;
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
  verbs?: string[];           // not used in RecipeParticle
  args?: ParticleArgument[];  // not used in RecipeParticle
  affordance?: string[];      // not used in RecipePartcile
  slots?:
      ParticleSlot[];    // TODO ParticleSlots, also not used in RecipeParticle
  description?: string;  // not used in RecipeParticle
  hasParticleArgument?: boolean;  // not used in RecipeParticle

  // fields in RecipeParticle only
  ref?: any;  // ParticleRef
  connections?: RecipeParticleConnection[];
  slotConnections?: RecipeParticleSlotConnection[];
}


export interface ParticleAffordance extends BaseToken {
  kind: 'particle-affordance';
  affordance: string;
}

export interface ParticleArgument extends BaseToken {
  kind: 'particle-argument';
  direction: string;
  type: ParticleArgumentType;
  isOptional: boolean;
  dependentConnections: string[];
  name: string;
  tags: string[];
}

export interface ParticleHandleDescription extends BaseToken {
  kind: 'handle-description';
  name;
  string;
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
  tags: string[];
  isRequired: boolean;
  isSet: boolean;
  formFactor: SlotFormFactor;
  providedSlots: ParticleProvidedSlot[];
}

export interface ParticleProvidedSlot extends BaseToken {
  kind: 'provided-slot';
  name: string;
  tags: string[];
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
  verbs: string[];
}

export interface Recipe extends BaseToken {
  kind: 'recipe';
  name: string;
  verbs: string[];
  items: any[];  // TODO RecipeItem
}

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
  tags: string[];
}

export interface ParticleConnnectionTargetComponents extends BaseToken {
  kind: 'hanlde-connection-components';
  name: string|null;
  particle: string|null;
  tags: string[];
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
  tags: string[];
  name: string;
  providedSlots: any[];  // RecipeParticleProvidedSlot
}

export interface RecipeSlotConnectionRef extends BaseToken {
  kind: 'slot-connection-ref';
  param: string;
  tags: string[];
}

export interface RecipeParticleProvidedSlot extends BaseToken {
  kind: 'slot-connection-ref';
  param: string;
  name: string|null;
}

export interface RecipeConnection extends BaseToken {
  kind: 'connection';
  direction: string;
  from: any;  // ConnectionTarget
  to: any;    // ConnectionTarget
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

  verbs?: string[];
  param: string;    // from ConnectionTargetHandleComponents
  tags?: string[];  // from ConnectionTargetHandleComponents
}

export interface ConnectionTargetHandleComponents {
  param: string;
  tags: string[];
}

export interface Resource extends BaseToken {
  kind: 'resource';
  name: string;
  data: string;
}

export interface Schema extends BaseToken {
  kind: 'schema';
  items: any[];  // TODO
  alias?: string;
}

export interface SchemaSection extends BaseToken {
  kind: 'schema-section';
  sectionType: string;
  fields: SchemaField[];
}

export interface SchemaField extends BaseToken {
  kind: 'schema-field';
  type: any;  // SchemaType
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

export interface SchemaSpec {
  names: string[];
  parents: string[];
}


type SchemaType = any;

export interface Shape extends BaseToken {
  kind: 'shape';
  name: string;
  slots: ShapeSlot[];

  interface?: ShapeInterface[];
  args?: ShapeArgument[];
}

export interface ShapeArgument extends BaseToken {
  kind: 'shape-argument';
  direction: string;
  type: string;
  name: string;
}

export interface ShapeInterface extends BaseToken {
  kind: 'shape-interface';
  verb: string;
  args: ShapeArgument[];  // ShapeArgumentList?
}

export interface ShapeSlot extends BaseToken {
  kind: 'shape-slot';
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

export interface NameAndTag {
  name: string;
  tags: string[];
}

export type ParticleArgumentType = VariableType|CollectionType|
    BigCollectionType|ReferenceType|SlotType|SchemaInline|TypeName;

// Note that ManifestStorage* are not here, as they do not have 'kind'
export type All = Import|Meta|MetaName|MetaStorageKey|Particle|ParticleArgument|
    ParticleInterface|RecipeHandle|Resource|Shape|ShapeArgument|ShapeInterface|
    ShapeSlot;

export type ManifestItem =
    Recipe|Particle|Import|Schema|ManifestStorage|Shape|Meta|Resource;
