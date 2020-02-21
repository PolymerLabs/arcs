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

package arcs.sdk.storage

/**
 * Represents a location in Arcs' storage system where an [Entity], [Collection], [Singleton], or a
 * region of any of those items can be found.
 */
typealias StorageKey = arcs.core.storage.StorageKey

/**
 * A [StorageKey] implementation for data kept in memory and bound to the lifecycle of the [Arc]
 * which created the data.
 */
typealias VolatileStorageKey = arcs.core.storage.driver.VolatileStorageKey

/**
 * A [StorageKey] implementation for data kept in memory and which is globally-accessible.
 */
typealias RamDiskStorageKey = arcs.core.storage.driver.RamDiskStorageKey

/**
 * A [StorageKey] implementation for data persisted to disk using a SQL (or SQL-like) database.
 */
typealias DatabaseStorageKey = arcs.core.storage.driver.DatabaseStorageKey
