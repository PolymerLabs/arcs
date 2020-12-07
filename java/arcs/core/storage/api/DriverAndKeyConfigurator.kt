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

import arcs.core.data.CreatableStorageKey
import arcs.core.data.SchemaRegistry
import arcs.core.storage.CapabilitiesResolver
import arcs.core.storage.DefaultDriverFactory
import arcs.core.storage.DriverProvider
import arcs.core.storage.StorageKeyManager
import arcs.core.storage.StorageKeyParser
import arcs.core.storage.database.DatabaseManager
import arcs.core.storage.driver.DatabaseDriverProvider
import arcs.core.storage.driver.RamDiskDriverProvider
import arcs.core.storage.driver.VolatileDriverProvider
import arcs.core.storage.keys.DatabaseStorageKey
import arcs.core.storage.keys.ForeignStorageKey
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
  fun configure(databaseManager: DatabaseManager?) {
    val driverProviders = mutableListOf(
      RamDiskDriverProvider(),
      VolatileDriverProvider()
    )
    // Only register the database driver provider if a database manager was provided.
    databaseManager?.let {
      driverProviders += DatabaseDriverProvider.configure(it, SchemaRegistry::getSchema)
    }

    DefaultDriverFactory.update(driverProviders)

    // Also register the parsers.
    configureKeyParsersAndFactories()
  }

  /**
   * A convenience method to register behavior for the commonly used set of [StorageKey]s.
   *
   * Registers a number of likely-used [StorageKey]s with the global []StorageKeyParser] instance,
   * and registers a number of like-used [StorageKeyFactory] instances with the global
   * [CapabilitiesResolver] instance.
   */
  fun configureKeyParsersAndFactories() {
    // Start fresh.
    StorageKeyManager.GLOBAL_INSTANCE.reset(
      VolatileStorageKey,
      RamDiskStorageKey,
      DatabaseStorageKey.Persistent,
      DatabaseStorageKey.Memory,
      CreatableStorageKey,
      ReferenceModeStorageKey,
      JoinStorageKey,
      ForeignStorageKey
    )

    CapabilitiesResolver.reset()
    CapabilitiesResolver.registerStorageKeyFactory(VolatileStorageKey.VolatileStorageKeyFactory())
    CapabilitiesResolver.registerStorageKeyFactory(RamDiskStorageKey.RamDiskStorageKeyFactory())
    CapabilitiesResolver.registerStorageKeyFactory(DatabaseStorageKey.Persistent.Factory())
    CapabilitiesResolver.registerStorageKeyFactory(DatabaseStorageKey.Memory.Factory())
  }
}
