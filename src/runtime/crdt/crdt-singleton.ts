// Copyright (c) 2019 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import { VersionMap, CRDTChange, CRDTModel } from "./crdt.js";

type RawSingleton<T> = T;

type RawCRDTSingleton<T> = { values: Set<{ value: T, clock: VersionMap }>, version: VersionMap };

type CRDTSingletonOperation<T> = { from: T | null, to: T | null, actor: string };

type CRDTSingletonChange<T> = CRDTChange<CRDTSingletonOperation<T>, RawCRDTSingleton<T>>;

type CRDTSingletonModel<T> = CRDTModel<CRDTSingletonOperation<T>, RawCRDTSingleton<T>, RawSingleton<T>>;

