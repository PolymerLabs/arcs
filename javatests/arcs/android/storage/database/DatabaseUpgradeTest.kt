package arcs.android.storage.database

import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import androidx.test.core.app.ApplicationProvider
import arcs.android.common.map
import arcs.android.common.transaction
import arcs.core.util.testutil.LogRule
import arcs.flags.testing.BuildFlagsRule
import arcs.flags.testing.ParameterizedBuildFlags
import com.google.common.truth.Truth.assertThat
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.ParameterizedRobolectricTestRunner

@RunWith(ParameterizedRobolectricTestRunner::class)
class DatabaseUpgradeTest(private val parameters: ParameterizedBuildFlags) {

  @get:Rule
  val rule = BuildFlagsRule.parameterized(parameters)

  @get:Rule
  val log = LogRule()

  /**
   * Tests that create and migrate steps are valid. It only tests that they are valid SQL statements
   * and can be applied in sequence. It does not test that the database is working correctly at each
   * step.
   */
  @Test
  fun canMigrateVersions() {
    // Record the schema at the final version.
    val finalSchema = getFinalSchema()

    for (start in FIRST_RECORDED_VERSION until FINAL_VERSION) {
      log("Testing migration steps from $start to $FINAL_VERSION:")
      val helper = Helper(start)
      helper.writableDatabase.transaction {
        log("  create at version $start")
        val create = checkNotNull(DatabaseImpl.CREATES_BY_VERSION[start]) {
          "Missing CREATE statements for version $start"
        }
        create.forEach(::execSQL)
        for (i in start + 1 until FINAL_VERSION + 1) {
          log("  migration steps at $i")
          val migrationSteps = checkNotNull(DatabaseImpl.MIGRATION_STEPS[i]) {
            "Missing MIGRATION STEPS for version $i"
          }
          migrationSteps.forEach(::execSQL)
        }
        // Check that we always end up with the same schema.
        assertThat(getAllSchemas(this)).isEqualTo(finalSchema)
      }
      helper.close()
    }
  }

  /**
   * Gets the schema at the last version.
   */
  private fun getFinalSchema(): Map<String, List<SqliteColumn>> {
    Helper(-1).writableDatabase.transaction {
      DatabaseImpl.CREATES_BY_VERSION.getValue(FINAL_VERSION).forEach(::execSQL)
      return getAllSchemas(this)
    }
  }

  private fun getAllSchemas(db: SQLiteDatabase): Map<String, List<SqliteColumn>> {
    return DatabaseImpl.TABLES.asSequence().associateWith { getTableSchema(db, it) }
  }

  private fun getTableSchema(db: SQLiteDatabase, name: String): List<SqliteColumn> {
    return db.rawQuery(
      "PRAGMA TABLE_INFO($name)",
      emptyArray()
    ).map {
      SqliteColumn(
        name = it.getString(it.getColumnIndex("name")),
        type = it.getString(it.getColumnIndex("type")),
        notNull = it.getInt(it.getColumnIndex("notnull")),
        primaryKey = it.getInt(it.getColumnIndex("pk"))
      )
    }
  }

  class Helper(i: Int) : SQLiteOpenHelper(
    ApplicationProvider.getApplicationContext(),
    "name$i",
    null,
    1
  ) {
    override fun onCreate(db: SQLiteDatabase) {}
    override fun onUpgrade(db: SQLiteDatabase?, oldVersion: Int, newVersion: Int) {}
  }

  /**
   *  Represents the output of a PRAGMA TABLE_INFO statement.
   */
  data class SqliteColumn(
    val name: String,
    val type: String,
    val notNull: Int,
    val primaryKey: Int
  )

  private companion object {
    @JvmStatic
    @ParameterizedRobolectricTestRunner.Parameters(name = "{0}")
    fun params() = ParameterizedBuildFlags.of(
      "REFERENCE_MODE_STORE_FIXES",
      "STORAGE_KEY_REDUCTION"
    ).toList()

    // We start from 3 because we didn't record create statements for versions 1 and 2.
    private const val FIRST_RECORDED_VERSION = 3

    private val FINAL_VERSION get() = DatabaseImpl.DB_VERSION
  }
}
