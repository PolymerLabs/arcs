/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {DirectionPreSlandles} from './manifest-ast-nodes.js';
import {Claim} from './particle-claim.js';
import {Type} from './type.js';

export type CheckTarget = HandleConnectionSpecInterface | ProvideSlotConnectionSpecInterface;

export interface CheckInterface {
  target: CheckTarget;
  // TODO: The following should be a CheckExpression, or rather an interface.
  // tslint:disable-next-line: no-any
  expression: any;
  toManifestString();
}

export interface HandleConnectionSpecInterface {
  discriminator: 'HCS';
  direction: DirectionPreSlandles;
  name: string;
  type: Type;
  isOptional: boolean;
  tags: string[];
  dependentConnections: HandleConnectionSpecInterface[];
  pattern?: string;
  parentConnection: HandleConnectionSpecInterface | null;
  claims?: Claim[];
  check?: CheckInterface;
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
  check?: CheckInterface;
}
