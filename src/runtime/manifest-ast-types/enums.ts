/**
 * @license
 * Copyright 2020 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

// String-based enums.
// TODO: convert to actual enums so that they can be iterated over.

export type Direction = 'reads' | 'writes' | 'reads writes' | 'hosts' | '`consumes' | '`provides' | 'any';
export type SlotDirection = 'provides' | 'consumes';

/** The different types of trust claims that particles can make. */
export enum ClaimType {
  IsTag = 'is-tag',
  DerivesFrom = 'derives-from',
}

/** The different types of trust checks that particles can make. */
export enum CheckType {
  HasTag = 'has-tag',
  IsFromHandle = 'is-from-handle',
  IsFromOutput = 'is-from-output',
  IsFromStore = 'is-from-store',
  Implication = 'implication',
}

export type Fate = 'use' | 'create' | 'map' | 'copy' | 'join' | '?' | '`slot';
