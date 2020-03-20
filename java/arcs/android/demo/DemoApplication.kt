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

package arcs.android.demo

import android.app.Application
import androidx.work.Configuration
import arcs.android.util.initLogForAndroid
import arcs.core.storage.driver.RamDisk
import arcs.core.storage.driver.RamDiskDriverProvider
import arcs.core.storage.keys.RamDiskStorageKey
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.core.util.Log

/** Application class for Arcs Demo. */
class DemoApplication : Application(), Configuration.Provider {

    override fun getWorkManagerConfiguration() =
        Configuration.Builder()
            .setMinimumLoggingLevel(android.util.Log.DEBUG)
            .build()

    override fun onCreate() {
        super.onCreate()

        RamDisk.clear()
        RamDiskDriverProvider()
        RamDiskStorageKey.registerParser()
        RamDiskStorageKey.registerKeyCreator()

        ReferenceModeStorageKey.registerParser()

        initLogForAndroid(Log.Level.Debug)
    }
}
