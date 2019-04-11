/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {VersionMap, CRDTChange, CRDTModel} from "./crdt.js";

type RawCollection<T> = Set<T>;

type CollectionValue<T> = {value: T, clock: VersionMap};
type CollectionData<T> = {values: Set<{value: T, clock: VersionMap}>, version: VersionMap};

enum CollectionOpTypes {Add, Remove}
type CollectionOperation<T> = {type: CollectionOpTypes.Add, added: CollectionValue<T>} |
                              {type: CollectionOpTypes.Remove, removed: T};

type CollectionChange<T> = CRDTChange<CollectionOperation<T>, CollectionData<T>>;

type CollectionModel<T> = CRDTModel<CollectionOperation<T>, CollectionData<T>, RawCollection<T>>;
