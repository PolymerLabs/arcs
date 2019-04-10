// Copyright (c) 2019 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import { VersionMap, CRDTChange, CRDTModel } from "./crdt.js";

type RawCollection<T> = Set<T>;

type RawCRDTCollectionValue<T> = { value: T, clock: VersionMap };
type RawCRDTCollection<T> = { values: Set<{ value: T, clock: VersionMap }>, version: VersionMap }

enum CRDTCollectionOpTypes { CollectionAdd, CollectionRemove }
type CRDTCollectionOperation<T> = { type: CRDTCollectionOpTypes.CollectionAdd, added: RawCRDTCollectionValue<T> } |
                                  { type: CRDTCollectionOpTypes.CollectionRemove, removed: T };

type CRDTCollectionChange<T> = CRDTChange<CRDTCollectionOperation<T>, RawCRDTCollection<T>>;

type CRDTCollectionModel<T> = CRDTModel<CRDTCollectionOperation<T>, RawCRDTCollection<T>, RawCollection<T>>;
