/*
 * Copyright 2021 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */

package arcs.android.storage.database

import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import arcs.android.storage.database.testutil.AddOpGenerator
import arcs.android.storage.database.testutil.DatabaseOpsGenerator
import arcs.android.storage.database.testutil.RemoveOpGenerator
import arcs.android.storage.database.testutil.SmallIntegerIdGenerator
import arcs.android.util.testutil.AndroidLogRule
import arcs.core.data.SchemaRegistry
import arcs.core.storage.StorageKeyManager
import arcs.core.storage.database.DatabaseConfig
import arcs.core.storage.testutil.DummyStorageKey
import arcs.core.storage.testutil.DummyStorageKeyManager
import arcs.core.testutil.runFuzzTest
import arcs.flags.testing.BuildFlagsRule
import org.junit.After
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class DatabaseImplFuzzTest {

  @get:Rule
  val log = AndroidLogRule()

  @get:Rule
  val buildFlagsRule = BuildFlagsRule.create()

  private lateinit var database: DatabaseImpl

  @Before
  fun setUp() {
    database = DatabaseImpl(
      ApplicationProvider.getApplicationContext(),
      DummyStorageKeyManager(),
      "test.sqlite3",
      databaseConfigGetter = { DatabaseConfig() }
    )
    StorageKeyManager.GLOBAL_INSTANCE.addParser(DummyStorageKey)
  }

  @After
  fun tearDown() {
    database.reset()
    database.close()
    StorageKeyManager.GLOBAL_INSTANCE.reset()
    SchemaRegistry.clearForTest()
  }

  @Test
  fun addAndRemoveOpsFuzzTest() = runFuzzTest {
    val storageKey = DummyStorageKey("collection")
    val idGenerator = SmallIntegerIdGenerator(it)
    invariant_addAndRemoveOpsAddUp(
      DatabaseOpsGenerator(
        it,
        idGenerator,
        AddOpGenerator(idGenerator),
        RemoveOpGenerator(idGenerator)
      )(),
      storageKey,
      database
    )
  }
}
