/*
 * Copyright 2020 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */

package arcs.android.storage.service;

import arcs.android.storage.service.IResultCallback;
import arcs.android.storage.service.IStorageServiceCallback;

/**
 * Exposed API to manage storage via the StorageService.
 */
interface IStorageServiceManager {

    /** Clear all arcs data. */
    void clearAll(IResultCallback resultCallback);

    /** Clear all arcs data created within the provided time window. */
    void clearDataBetween(long startTimeMillis, long endTimeMillis, IResultCallback resultCallback);
}
