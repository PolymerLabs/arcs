/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {VersionMap, CRDTChange, CRDTModel, CRDTTypeRecord} from "./crdt.js";

type RawSingleton<T> = T;

type SingletonData<T> = {values: Set<{ value: T, clock: VersionMap }>, version: VersionMap};

type SingletonOperation<T> = {from: T | null, to: T | null, actor: string};

interface CRDTSingletonTypeRecord<T> extends CRDTTypeRecord {
  data: SingletonData<T>;
  operation: SingletonOperation<T>;
  consumerType: RawSingleton<T>;
}

type SingletonChange<T> = CRDTChange<CRDTSingletonTypeRecord<T>>;

type SingletonModel<T> = CRDTModel<CRDTSingletonTypeRecord<T>>;

