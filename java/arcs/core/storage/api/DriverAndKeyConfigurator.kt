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

package arcs.core.storage.api

import arcs.core.common.ArcId
import arcs.core.data.CreateableStorageKey
import arcs.core.entity.SchemaRegistry
import arcs.core.storage.DriverFactory
import arcs.core.storage.StorageKeyParser
import arcs.core.storage.database.DatabaseManager
import arcs.core.storage.driver.DatabaseDriverProvider
import arcs.core.storage.driver.RamDiskDriverProvider
import arcs.core.storage.driver.VolatileDriverProvider
import arcs.core.storage.keys.DatabaseStorageKey
import arcs.core.storage.keys.JoinStorageKey
import arcs.core.storage.keys.RamDiskStorageKey
import arcs.core.storage.keys.VolatileStorageKey
import arcs.core.storage.referencemode.ReferenceModeStorageKey

/**
 * Singleton to allow the caller to set up storage [DriverProvider]s and the [StorageKeyParser].
 */
object DriverAndKeyConfigurator {
    /**
     * Allows the caller to configure & register [DriverProvider]s as well as the
     * [StorageKeyParser].
     */
    // TODO: make the set of drivers/keyparsers configurable.
    fun configure(databaseManager: DatabaseManager?, vararg arcIds: ArcId) {
        // Start fresh.
        DriverFactory.clearRegistrations()

        // Register volatile driver providers for every ArcId
        arcIds.forEach { VolatileDriverProvider(it) }
        RamDiskDriverProvider()
        // Only register the database driver provider if a database manager was provided.
        databaseManager?.let {
            DatabaseDriverProvider.configure(it, SchemaRegistry::getSchema)
        }

        // Also register the parsers.
        configureKeyParsers()
    }

    /**
     * Allows the caller to ensure all of the available key parsers are registered.
     */
    // TODO: make the set of keyparsers configurable.
    fun configureKeyParsers() {
        // Start fresh.
        StorageKeyParser.reset()

        VolatileStorageKey.registerParser()
        VolatileStorageKey.registerKeyCreator()
        RamDiskStorageKey.registerParser()
        RamDiskStorageKey.registerKeyCreator()
        DatabaseStorageKey.registerParser()
        DatabaseStorageKey.registerKeyCreator()
        // Below storage keys don't have respective drivers,
        // and therefore they don't have key creators.
        CreateableStorageKey.registerParser()
        ReferenceModeStorageKey.registerParser()
        JoinStorageKey.registerParser()
    }
}
