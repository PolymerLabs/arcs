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

package arcs.android.storage.database

import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import androidx.test.core.app.ApplicationProvider
import arcs.android.common.map
import arcs.android.common.transaction
import arcs.android.util.testutil.AndroidLogRule
import arcs.core.storage.database.DatabaseConfig
import arcs.core.storage.testutil.DummyStorageKeyManager
import arcs.flags.testing.BuildFlagsRule
import arcs.flags.testing.ParameterizedBuildFlags
import com.google.common.truth.Truth.assertThat
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.ParameterizedRobolectricTestRunner

@RunWith(ParameterizedRobolectricTestRunner::class)
class DatabaseDowngradeTest(private val parameters: ParameterizedBuildFlags) {

  @get:Rule
  val rule = BuildFlagsRule.parameterized(parameters)

  @get:Rule
  val log = AndroidLogRule()

  @Test
  fun onDowngrade_dropsExistingTables_andRecreatesThem() {
    // Use the DatabaseImpl Version plus one for the Dummy to ensure that when we create the
    // actual DatabaseImpl, a downgrade happens.
    val dummyHelper = DummyHelper(
      ApplicationProvider.getApplicationContext(),
      "arcs",
      DatabaseImpl.DB_VERSION + 1
    )

    // Open up the dummy helper, so it creates the dummy tables.
    dummyHelper.writableDatabase

    // Just make sure that our tables were created.
    dummyHelper.assertTables(dummyHelper.getTableNames())
    dummyHelper.assertIndexes(dummyHelper.getIndexNames())
    dummyHelper.close()

    val databaseImpl = DatabaseImpl(
      ApplicationProvider.getApplicationContext(),
      DummyStorageKeyManager(),
      "arcs",
      true,
      { DatabaseConfig() }
    )

    // Open up the databaseImpl, so it performs a downgrade.
    databaseImpl.writableDatabase

    // Make sure that none of the dummy tables are around anymore.
    dummyHelper.assertTablesMissing(databaseImpl.getTableNames())
    dummyHelper.assertIndexesMissing(databaseImpl.getIndexNames())
    assertThat(databaseImpl.getTableNames()).containsExactly(
      *(DatabaseImpl.TABLES + arrayOf("android_metadata", "sqlite_sequence"))
    )
  }

  private fun SQLiteOpenHelper.getTableNames(): Collection<String> =
    readableDatabase.rawQuery(
      "SELECT name FROM sqlite_master WHERE type = 'table'",
      emptyArray()
    ).map { it.getString(0) }

  private fun SQLiteOpenHelper.getIndexNames(): Collection<String> =
    readableDatabase.rawQuery(
      "SELECT name FROM sqlite_master WHERE type = 'index'",
      emptyArray()
    ).map { it.getString(0) }

  private class DummyHelper(
    context: Context,
    name: String,
    version: Int
  ) : SQLiteOpenHelper(context, name, /* cursorFactory = */ null, version) {
    private var initialized = false

    override fun onConfigure(db: SQLiteDatabase?) {
      super.onConfigure(db)
      db?.enableWriteAheadLogging()
    }

    override fun onCreate(db: SQLiteDatabase) = synchronized(db) {
      if (initialized) return
      db.transaction {
        // Use an AUTOINCREMENT field, so the special sqlite_sequence table is created.
        db.execSQL("CREATE TABLE foo (id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, field TEXT)")
        db.execSQL("CREATE TABLE bar (field TEXT)")
        db.execSQL("CREATE TABLE baz (field TEXT)")
        db.execSQL("CREATE TABLE not_an_arcs_table_either (field TEXT)")
        db.execSQL("CREATE INDEX foos ON foo (field)")
        db.execSQL("CREATE INDEX bars ON bar (field)")
      }
      initialized = true
    }

    override fun onUpgrade(db: SQLiteDatabase?, oldVersion: Int, newVersion: Int) {
      throw UnsupportedOperationException()
    }

    fun assertTables(actualNames: Collection<String>) {
      assertThat(actualNames)
        .containsExactly(
          "foo",
          "bar",
          "baz",
          "not_an_arcs_table_either",
          "android_metadata",
          "sqlite_sequence"
        )
    }

    fun assertTablesMissing(actualNames: Collection<String>) {
      assertThat(actualNames).doesNotContain("foo")
      assertThat(actualNames).doesNotContain("bar")
      assertThat(actualNames).doesNotContain("baz")
      assertThat(actualNames).doesNotContain("not_an_arcs_table_either")
    }

    fun assertIndexes(actualNames: Collection<String>) {
      assertThat(actualNames).containsExactly("foos", "bars")
    }

    fun assertIndexesMissing(actualNames: Collection<String>) {
      assertThat(actualNames).doesNotContain("foos")
      assertThat(actualNames).doesNotContain("bars")
    }
  }

  private companion object {
    @JvmStatic
    @ParameterizedRobolectricTestRunner.Parameters(name = "{0}")
    fun params() = ParameterizedBuildFlags.of(
      "STORAGE_KEY_REDUCTION"
    ).toList()
  }
}
