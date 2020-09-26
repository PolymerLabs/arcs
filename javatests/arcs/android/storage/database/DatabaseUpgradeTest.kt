package arcs.android.storage.database

import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import arcs.android.common.transaction
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class DatabaseUpgradeTest {

  @Test
  fun canMigrateVersions3To6() {
    Helper().writableDatabase.transaction {
      DatabaseImpl.CREATE_VERSION_3.forEach(::execSQL)
      DatabaseImpl.VERSION_4_MIGRATION.forEach(::execSQL)
      DatabaseImpl.VERSION_5_MIGRATION.forEach(::execSQL)
      DatabaseImpl.VERSION_6_MIGRATION.forEach(::execSQL)
    }
  }

  @Test
  fun canMigrateVersions4To6() {
    Helper().writableDatabase.transaction {
      DatabaseImpl.CREATE_VERSION_4.forEach(::execSQL)
      DatabaseImpl.VERSION_5_MIGRATION.forEach(::execSQL)
      DatabaseImpl.VERSION_6_MIGRATION.forEach(::execSQL)
    }
  }

  @Test
  fun canMigrateVersions5To6() {
    Helper().writableDatabase.transaction {
      DatabaseImpl.CREATE_VERSION_5.forEach(::execSQL)
      DatabaseImpl.VERSION_6_MIGRATION.forEach(::execSQL)
    }
  }

  class Helper() : SQLiteOpenHelper(
    ApplicationProvider.getApplicationContext(),
    "name",
    null,
    1
  ) {
    override fun onCreate(db: SQLiteDatabase) {}
    override fun onUpgrade(db: SQLiteDatabase?, oldVersion: Int, newVersion: Int) {}
  }
}
