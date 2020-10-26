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

package arcs.android.e2e.testapp

import android.app.Application
import androidx.work.Configuration
import arcs.android.storage.database.AndroidSqliteDatabaseManager
import arcs.android.util.initLogForAndroid
import arcs.core.storage.api.DriverAndKeyConfigurator
import arcs.core.storage.driver.RamDisk
import arcs.core.util.Log
import arcs.core.util.TaggedLog
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.runBlocking

/** Application class for Arcs Test. */
@OptIn(ExperimentalCoroutinesApi::class)
class TestApplication : Application(), Configuration.Provider {
  private val log = TaggedLog { "TestApplication" }

  override fun getWorkManagerConfiguration() =
    Configuration.Builder()
      .setMinimumLoggingLevel(android.util.Log.DEBUG)
      .build()

  override fun onCreate() {
    initLogForAndroid(Log.Level.Debug)
    log.info { "onCreate ${getProcessName()}" }
    super.onCreate()
    runBlocking { RamDisk.clear() }
    DriverAndKeyConfigurator.configure(AndroidSqliteDatabaseManager(this))
  }
}
