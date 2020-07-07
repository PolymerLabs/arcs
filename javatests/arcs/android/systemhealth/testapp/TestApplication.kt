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

package arcs.android.systemhealth.testapp

import android.app.Application
import androidx.work.Configuration
import arcs.android.storage.database.AndroidSqliteDatabaseManager
import arcs.android.util.connectMemoryStatsPipe
import arcs.android.util.initLogForAndroid
import arcs.core.data.SchemaRegistry
import arcs.core.storage.api.DriverAndKeyConfigurator
import arcs.core.storage.driver.RamDisk

/** Application class for Arcs System Health measures. */
class TestApplication : Application(), Configuration.Provider {

    override fun getWorkManagerConfiguration() =
        Configuration.Builder()
            .setMinimumLoggingLevel(android.util.Log.DEBUG)
            .build()

    override fun onCreate() {
        super.onCreate()

        RamDisk.clear()
        SchemaRegistry.register(TestEntity.SCHEMA)
        DriverAndKeyConfigurator.configure(AndroidSqliteDatabaseManager(this))

        initLogForAndroid()
        connectMemoryStatsPipe()
    }
}
