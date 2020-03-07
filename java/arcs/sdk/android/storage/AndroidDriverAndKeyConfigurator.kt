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

package arcs.sdk.android.storage

import android.content.Context
import arcs.android.storage.database.AndroidSqliteDatabaseManager
import arcs.core.common.ArcId
import arcs.core.storage.api.DriverAndKeyConfigurator
import arcs.sdk.android.storage.AndroidDriverAndKeyConfigurator.configure

/**
 * Singleton to allow the caller to set up storage [DriverProvider]s and the [StorageKeyParser].
 *
 * Usage:
 *
 * In your [Application] class:
 *
 * ```kotlin
 * override fun onCreate() {
 *     DriverAndKeyConfigurator.configure(
 *         this,
 *         "myArcId1",
 *         "myArcId2",
 *         // ...
 *     )
 * }
 * ```
 *
 * **Note:** [configure] only needs to be called before the [StorageService] is used, so you don't
 * necessarily *need* to do it in [Application.onCreate], but it should be done before any arcs are
 * started.
 */
object AndroidDriverAndKeyConfigurator {
    /**
     * Allows the caller to configure & register [DriverProvider]s for the [StorageService].
     */
    // TODO: make the set of drivers/keyparsers configurable.
    fun configure(context: Context, vararg arcIds: ArcId) {
        DriverAndKeyConfigurator.configure(AndroidSqliteDatabaseManager(context), *arcIds)
    }

    /**
     * Allows the caller to ensure all of the available key parsers are registered.
     */
    fun configureKeyParsers() {
        DriverAndKeyConfigurator.configureKeyParsers()
    }
}
