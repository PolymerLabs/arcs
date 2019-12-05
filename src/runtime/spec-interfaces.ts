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

export type CheckTarget = HandleConnectionSpecIntf | ProvideSlotConnectionSpecIntf;

export interface CheckIntf {
  target: CheckTarget;
  // tslint:disable-next-line: no-any
  expression: any;
  toManifestString();
}

export interface HandleConnectionSpecIntf {
  discriminator: 'HCS';
  direction: DirectionPreSlandles;
  name: string;
  type: Type;
  isOptional: boolean;
  tags: string[];
  dependentConnections: HandleConnectionSpecIntf[];
  pattern?: string;
  parentConnection: HandleConnectionSpecIntf | null;
  claims?: Claim[];
  check?: CheckIntf;
  isInput: boolean;
  isOutput: boolean;

  instantiateDependentConnections(particle, typeVarMap: Map<string, Type>): void;
  toSlotConnectionSpec(): ConsumeSlotConnectionSpecIntf;
  isCompatibleType(type: Type): boolean;
}

export interface ConsumeSlotConnectionSpecIntf {
  discriminator: 'CSCS';
  name: string;
  isRequired: boolean;
  isSet: boolean;
  tags: string[];
  formFactor: string;
  handles: string[];
  provideSlotConnections: ProvideSlotConnectionSpecIntf[];
  isOptional: boolean;
  direction: string;
  type: Type;
  dependentConnections: ProvideSlotConnectionSpecIntf[];
}

export interface ProvideSlotConnectionSpecIntf extends ConsumeSlotConnectionSpecIntf {
  discriminator: 'CSCS';
  check?: CheckIntf;
}
