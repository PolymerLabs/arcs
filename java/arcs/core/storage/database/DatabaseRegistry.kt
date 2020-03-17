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

/**
 * Mutable variant of [DatabaseRegistry], which allows the user to register newly-created databases.
 */
interface MutableDatabaseRegistry : DatabaseRegistry {
    /**
     * Registers a new [Database] with the manager, by its [databaseName] and whether or not it
     * [isPersistent].
     *
     * This operation is idempotent. Ie. if the [Database] already exists within the manifest, this
     * operation is a no-op.
     */
    fun register(databaseName: String, isPersistent: Boolean): DatabaseRegistration
}

/** Allows the user to inspect details about [Database]s managed by the [DatabaseManager]. */
interface DatabaseRegistry {
    /**
     * Fetches all [Entry]s in the [DatabaseManager].
     */
    fun fetchAll(): List<DatabaseRegistration>

    /** Fetches all [Entry]s created within the specified [timeRange]. */
    fun fetchAllCreatedIn(timeRange: LongRange): List<DatabaseRegistration>

    /** Fetches all [Entry]s last-accessed within the specified [timeRange]. */
    fun fetchAllAccessedIn(timeRange: LongRange): List<DatabaseRegistration>
}

/** Represents a [Database] being managed by the [DatabaseManager]. */
data class DatabaseRegistration(
    val name: String,
    val isPersistent: Boolean,
    val created: Long,
    val lastAccessed: Long
)
