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

import arcs.android.storage.service.IHardReferencesRemovalCallback;
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

    /**
     * Removes entities with a hard reference to the given [entityId] and backing
     * [storageKey]. Both must be specified, and both need to match (logical AND)
     * to qualify for the delete.
     *
     * @param storageKey backing storage key for the hard references (references
     *     with a different storage key will be ignored).
     * @param entityId entityId for the hard references (references with a
     *     different entityId will be ignored).
     * @param resultCallback callback used to return an asynchronous response
     *     which will indicate either an error or the number of entities removed.
     */
    void triggerHardReferenceDeletion(
      String storageKey,
      String entityId,
      IHardReferencesRemovalCallback resultCallback
    );

    /**
     * Checks all hard references with a matching [storageKey]. For each, if its
     * ID is NOT contained in [idsToRetain], the corresponding entity will be
     * deleted.
     *
     * @param storageKey backing storage key for the hard references (references
     *     with a different storage key will be ignored).
     * @param idsToRetain valid entityIds for the hard references (references to
     *     an ID not in this list will be removed). This is logically a set but
     *     aidls only support lists.
     * @param resultCallback callback used to return an asynchronous response
     *     which will indicate either an error or the number of entities removed.
     */
    void reconcileHardReferences(
      String storageKey,
      in List<String> idsToRetain,
      IHardReferencesRemovalCallback resultCallback
    );

    /**
     * Triggers a garbage collection run on every registered database.
     */
    void runGarbageCollection(IResultCallback resultCallback);
}
