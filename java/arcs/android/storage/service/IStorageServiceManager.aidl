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

/**
 * Exposed API to manage storage via the StorageService.
 */
oneway interface IStorageServiceManager {

    /** Clear all arcs data. */
    void clearAll(IResultCallback resultCallback);

    /** Clear all arcs data created within the provided time window. */
    void clearDataBetween(long startTimeMillis, long endTimeMillis, IResultCallback resultCallback);

    /**
     * Reset all the databases: this is a full db wipe and all data is lost, including all
     * metadata. The results of this operation do NOT propagate to handles, therefore it is safe to
     * invoke only during a full system shutdown. If you are not shutting down Arcs, please use
     * clearAll() instead. This differs from clearAll in that clearAll will delete all entities, but
     * still preserve metadata and propagate changes to handles.
     */
    void resetDatabases(IResultCallback resultCallback);
}
