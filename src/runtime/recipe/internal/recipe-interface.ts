/**
 * @license
 * Copyright (c) 2020 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Fate, Direction} from '../../arcs-types/enums.js';
import {HandleConnectionSpec, ConsumeSlotConnectionSpec, ParticleSpec} from '../../arcs-types/particle-spec.js';
import {Dictionary, Consumer, Producer} from '../../../utils/hot.js';
import {ClaimIsTag} from '../../arcs-types/claim.js';
import {Modality} from '../../arcs-types/modality.js';
import {Ttl, Capabilities} from '../../capabilities.js';
import {Id} from '../../id.js';
import {Type} from '../../type.js';
import {StorageKey} from '../../storage/storage-key.js';
import {AbstractStore} from '../../storage/abstract-store.js';
import {AnnotationRef} from '../annotation.js';
import {ParticleHandleDescription} from '../../manifest-ast-types/manifest-ast-nodes.js';
import {Policy} from '../../policy/policy.js';
import {Handle as HandleImpl} from './handle.js';

// TODO(shanestephens): create interface for AnnotationRef too.
export {AnnotationRef};

export type IsValidOptions = {errors?: Map<Recipe | RecipeComponent, string>, typeErrors?: string[]};
export type RecipeComponent = Particle | Handle | HandleConnection | Slot | SlotConnection | EndPoint;
export type ToStringOptions = {showUnresolved?: boolean, hideFields?: boolean, details?: string[]};

export interface ParticleEndPoint extends EndPoint {
  particle: ParticleSpec;
  connection: string;
}

export interface HandleEndPoint extends EndPoint {
  handle: Handle;
}

export interface TagEndPoint extends EndPoint {
  tags: string[];
}

export interface InstanceEndPoint extends EndPoint {
  instance: Particle;
}

export interface EndPointSelector {
  isParticleEndPoint?: Consumer<ParticleEndPoint>;
  isHandleEndPoint?: Consumer<HandleEndPoint>;
  isTagEndPoint?: Consumer<TagEndPoint>;
  isInstanceEndPoint?: Consumer<InstanceEndPoint>;
}

export interface EndPoint {
  _clone(): EndPoint;
  select(on: EndPointSelector): void;
  requireParticleEndPoint(errorMessage: Producer<string>): ParticleEndPoint;
  requireInstanceEndPoint(errorMessage: Producer<string>): InstanceEndPoint;
}


export interface Particle {
  name: string;
  spec?: ParticleSpec;
  connections: Dictionary<HandleConnection>;
  unnamedConnections: HandleConnection[];
  id: Id;
  recipe: Recipe;
  localName: string;
  verbs: string[];
  primaryVerb: string;

  // TODO(shanestephens): remove these?
  getSlotSpecs(): Map<string, ConsumeSlotConnectionSpec>;
  getSlotSpecByName(name: string): ConsumeSlotConnectionSpec;
  getSlotConnections(): SlotConnection[];
  getSlotConnectionByName(name: string): SlotConnection;
  getSlotConnectionNames(): string[];
  getSlotConnectionBySpec(spec: ConsumeSlotConnectionSpec): SlotConnection;
  getConnectionByName(name: string): HandleConnection;
  getSlandleConnections(): SlotConnection[];
  getSlandleConnectionByName(name: string): SlotConnection;
  getSlandleConnectionBySpec(spec: ConsumeSlotConnectionSpec): SlotConnection;
  getUnboundConnections(type: Type): HandleConnectionSpec[];

  // TODO(shanestephens): what is this?
  matches(particle: Particle): boolean;

  // TODO(shanestephens): we can probably delete all of this.
  isExternalParticle(): boolean;

  // TODO(shanestephens): should these be on a separate constructor interface?
  addSlotConnection(name: string): SlotConnection;
  addUnnamedConnection(): HandleConnection;
  addConnectionName(name: string): HandleConnection;
}

export interface Handle {
  id: string;
  fate: Fate;
  claims: Map<string, ClaimIsTag[]>;
  immediateValue?: ParticleSpec;
  type?: Type;
  tags: string[];
  capabilities: Capabilities;
  storageKey: StorageKey;
  localName: string;
  connections: HandleConnection[];
  recipe: Recipe;
  annotations: AnnotationRef[];
  getAnnotation(name: string): AnnotationRef;
  pattern: string;

  originalFate: Fate;
  mappedType?: Type;

  isJoined: boolean;
  joinedHandles: Handle[];

  getTtl(): Ttl;
  toSlot(): Slot | undefined;

  // TODO(shanestephens): should these be on a separate constructor interface?
  mapToStorage(store: AbstractStore): void;
  joinDataFromHandle(handle: Handle): void;

  findConnectionByDirection(direction: Direction): HandleConnection;
  restrictType(restrictedType: Type): void;
}

export interface Slot {
  id: string;
  name: string;
  tags: string[];
  sourceConnection: SlotConnection;
  consumeConnections: SlotConnection[];
  recipe: Recipe;
  localName: string;

  // TODO(shanestephens): should these be on a separate constructor interface?
  remove(): void;
}

export interface SlotConnection {
  particle: Particle;
  targetSlot: Slot;
  providedSlots: Dictionary<Slot>;
  getSlotSpec(): ConsumeSlotConnectionSpec;
  name: string;
  recipe: Recipe;
  tags: string[];

  isConnected(): boolean;

  // TODO(shanestephens): should these be on a separate constructor interface?
  connectToSlot(slot: Slot): void;
  disconnectFromSlot(): void;
}

export interface HandleConnection {
  particle: Particle;
  handle: Handle;
  spec: HandleConnectionSpec;
  name: string;
  direction: Direction;
  isOutput: boolean;
  isInput: boolean;
  tags: string[];
  relaxed: boolean;
  type: Type;
  recipe: Recipe;

  getQualifiedName(): string;

  // TODO(shanestephens): should these be on a separate constructor interface?
  connectToHandle(handle: Handle): void;
}

export interface ConnectionConstraint {
  from: EndPoint;
  to: EndPoint;
  direction: Direction;
  relaxed: boolean;
}

// TODO(shanestephens): strengthen this as a separate thing to Recipe
export interface RequireSection extends Recipe {
}

export interface Search {
  resolvedTokens: string[];
  unresolvedTokens: string[];
  phrase: string;

  resolveToken(token: string): void;
  isResolved(): boolean;
  isValid(): boolean;
}

// TODO(shanestephens): separate interfaces for Recipe & Plan?
export interface Recipe {
  particles: Particle[];
  handles: Handle[];
  slots: Slot[];
  handleConnections: HandleConnection[];
  slotConnections: SlotConnection[];
  obligations: ConnectionConstraint[];
  connectionConstraints: ConnectionConstraint[];
  requires: RequireSection[];
  search: Search;
  patterns: string[];
  parent?: Recipe;
  annotations: AnnotationRef[];
  isRequireSection: boolean;
  description: ParticleHandleDescription[];
  policyName: string;
  policy: Policy;

  modality: Modality;
  isCompatible(modality: Modality): boolean;

  verbs: string[];
  name: string | null;

  // TODO(shanestephens): type this properly
  isResolved(options?): boolean;
  isEmpty(): boolean;
  clone(map?: Map<RecipeComponent, RecipeComponent>): Recipe;
  digest(): Promise<string>;
  normalize(options?: IsValidOptions): boolean;
  toString(options?: ToStringOptions): string;
  getAnnotation(name: string): AnnotationRef | null;
  findAnnotations(name: string): AnnotationRef[];

  // TODO(shanestephens): remove these?
  findSlotByID(id: string): Slot | undefined;
  findHandleByID(id: string): Handle | undefined;
  getFreeHandles(): Handle[];
  getFreeConnections(type?: Type): {particle: Particle, connSpec: HandleConnectionSpec}[];
  getUnnamedUntypedConnections(): HandleConnection;
  getParticlesByImplFile(implFiles: Set<string>): Particle[];
  findParticle(id: string): Particle | undefined;

  // TODO(shanestephens): should these be on a separate constructor interface?
  newSlot(name: string): Slot;
  removeSlot(slot: Slot): void;
  newHandle(): Handle;
  newParticle(name: string): Particle;
  removeParticle(particle: Particle): void;
  newObligation(from: EndPoint, to: EndPoint, direction: Direction, relaxed: boolean): void;
  newConnectionConstraint(from: EndPoint, to: EndPoint, direction: Direction, relaxed: boolean): void;
  clearConnectionConstraints(): void;
  newRequireSection(): RequireSection;

  // TODO(shanestephens): rationalize these!
  // tslint:disable-next-line: no-any
  mergeInto(recipe: Recipe): {handles: Handle[], particles: Particle[], slots: Slot[], cloneMap: Map<any, any>};
  // tslint:disable-next-line: no-any
  updateToClone(dict: Dictionary<any>): Dictionary<any>;
}

// TODO(shanestephens): this should move into the type library.
export const effectiveTypeForHandle = HandleImpl.effectiveType;
