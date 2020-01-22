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

package arcs.core.storage.database

import arcs.core.data.Entity
import arcs.core.data.FieldName
import arcs.core.storage.StorageKey

/**
 * Exposes an API for interacting with a database. Actual database implementations are platform
 * dependent (e.g. SQLite on Android).
 */
interface Database {
    /** Inserts or updates the data at [storageKey] in the database. */
    suspend fun insertOrUpdate(storageKey: StorageKey, entity: Entity)

    /** Removes everything associated with the given [storageKey] from the database. */
    suspend fun delete(storageKey: StorageKey)
}
