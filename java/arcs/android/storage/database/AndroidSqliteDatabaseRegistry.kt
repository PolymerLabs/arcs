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

import android.annotation.SuppressLint
import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import arcs.android.common.forSingleResult
import arcs.android.common.map
import arcs.android.common.transaction
import arcs.core.storage.database.DatabaseRegistration
import arcs.core.storage.database.MutableDatabaseRegistry
import arcs.core.util.Time
import arcs.jvm.util.JvmTime

/** Android implementation of the arcs [DatabaseManifest]. */
class AndroidSqliteDatabaseRegistry(
    context: Context,
    private val time: Time = JvmTime
) : MutableDatabaseRegistry, SQLiteOpenHelper(context, MANIFEST_NAME, null, VERSION) {
    private val nonPersistentEntries = mutableMapOf<String, DatabaseRegistration>()

    override fun onConfigure(db: SQLiteDatabase?) {
        super.onConfigure(db)

        // Use WAL to expedite database registrations and subsequent updates on the last_accessed
        // column. Like other Android sqlite wrappers i.e. RoomDatabase, WAL mode is used by default:
        // https://developer.android.com/reference/androidx/room/RoomDatabase.JournalMode#AUTOMATIC
        //
        // Without using WAL, every getDatabase() which is invoked at multiple paths i.e. updating
        // Backing store upon data writes would suffer from a long I/O blocking time on fsync/fdatasync
        // just in order to update the last_accessed column. (b/154765922)
        db?.enableWriteAheadLogging()
    }

    override fun register(databaseName: String, isPersistent: Boolean): DatabaseRegistration {
        val nowMillis = time.currentTimeMillis
        if (!isPersistent) {
            return requireNotNull(
                nonPersistentEntries.compute(databaseName) { _, entry ->
                    entry?.copy(lastAccessed = nowMillis)
                        ?: DatabaseRegistration(
                            databaseName,
                            false,
                            nowMillis,
                            nowMillis
                        )
                }
            )
        }

        return writableDatabase.transaction {
            val existingEntry = rawQuery(
                """SELECT name, created, last_accessed FROM arcs_databases WHERE name = ?""",
                arrayOf(databaseName)
            ).forSingleResult {
                DatabaseRegistration(
                    name = it.getString(0),
                    isPersistent = true,
                    created = it.getLong(1),
                    lastAccessed = it.getLong(2)
                )
            }

            if (existingEntry != null) {
                val values = ContentValues().apply {
                    put("last_accessed", nowMillis)
                }
                update("arcs_databases", values, "name = ?", arrayOf(databaseName))
                return@transaction existingEntry.copy(lastAccessed = nowMillis)
            }

            val newEntry = DatabaseRegistration(
                name = databaseName,
                isPersistent = true,
                created = nowMillis,
                lastAccessed = nowMillis
            )

            val values = ContentValues().apply {
                put("name", newEntry.name)
                put("created", newEntry.created)
                put("last_accessed", newEntry.lastAccessed)
            }
            insert("arcs_databases", null, values)
            newEntry
        }
    }

    @SuppressLint("Recycle")
    override fun fetchAll(): List<DatabaseRegistration> {
        val persistentEntries = readableDatabase.rawQuery(
            "SELECT name, created, last_accessed FROM arcs_databases",
            emptyArray()
        ).map {
            DatabaseRegistration(
                name = it.getString(0),
                isPersistent = true,
                created = it.getLong(1),
                lastAccessed = it.getLong(2)
            )
        }
        return persistentEntries + nonPersistentEntries.values
    }

    override fun fetchAllCreatedIn(timeRange: LongRange): List<DatabaseRegistration> {
        val persistentEntries = readableDatabase.rawQuery(
            """
                SELECT name, created, last_accessed
                FROM arcs_databases
                WHERE created >= ? AND created <= ?
            """,
            arrayOf(timeRange.first.toString(), timeRange.last.toString())
        ).map {
            DatabaseRegistration(
                name = it.getString(0),
                isPersistent = true,
                created = it.getLong(1),
                lastAccessed = it.getLong(2)
            )
        }
        return persistentEntries + nonPersistentEntries.values.filter { it.created in timeRange }
    }

    override fun fetchAllAccessedIn(timeRange: LongRange): List<DatabaseRegistration> {
        val persistentEntries = readableDatabase.rawQuery(
            """
                SELECT name, created, last_accessed
                FROM arcs_databases
                WHERE last_accessed >= ? AND last_accessed <= ?
            """,
            arrayOf(timeRange.first.toString(), timeRange.last.toString())
        ).map {
            DatabaseRegistration(
                name = it.getString(0),
                isPersistent = true,
                created = it.getLong(1),
                lastAccessed = it.getLong(2)
            )
        }
        return persistentEntries +
            nonPersistentEntries.values.filter { it.lastAccessed in timeRange }
    }

    override fun onCreate(db: SQLiteDatabase) = db.execSQL(SCHEMA)

    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) = Unit

    companion object {
        private val VERSION = 1

        private val MANIFEST_NAME = "arcs_database_manifest"

        private val SCHEMA = """
            CREATE TABLE arcs_databases (
                name TEXT NOT NULL UNIQUE,
                created INTEGER NOT NULL,
                last_accessed INTEGER NOT NULL
            );
        """.trimIndent()
    }
}
