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

package arcs.android.common.resurrection

import android.content.ComponentName
import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import android.os.Parcel
import android.os.PersistableBundle
import androidx.annotation.VisibleForTesting
import arcs.core.storage.StorageKey
import arcs.core.storage.StorageKeyParser
import arcs.core.storage.driver.RamDiskStorageKey
import arcs.core.storage.driver.VolatileStorageKey
import arcs.core.storage.referencemode.ReferenceModeStorageKey

/**
 * Database abstraction layer for resurrection.
 */
@VisibleForTesting(otherwise = VisibleForTesting.PACKAGE_PRIVATE)
class DbHelper(
    context: Context,
    dbName: String = RESURRECTION_DB_NAME
) : SQLiteOpenHelper(
    context,
    dbName,
    /* cursorFactory = */ null,
    RESURRECTION_DB_VERSION
) {
    init {
        // Pre-initialize parsers.
        // TODO: Make a master storage key parsing initializer in arcs.core.storage.
        RamDiskStorageKey.registerParser()
        VolatileStorageKey.registerParser()
        ReferenceModeStorageKey.registerParser()
    }

    override fun onCreate(db: SQLiteDatabase) {
        db.transaction { CREATE.forEach(db::execSQL) }
    }

    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) = Unit

    /**
     * Stores a [ResurrectionRequest] in the database.
     */
    fun registerRequest(request: ResurrectionRequest) = writableDatabase.useTransaction {
        val requestContent = ContentValues()
            .apply {
                put("component_package", request.componentName.packageName)
                put("component_class", request.componentName.className)
                put("component_type", request.componentType.name)
                put("intent_action", request.intentAction)
                val extrasBlob = if (request.intentExtras != null) {
                    with(Parcel.obtain()) {
                        writeTypedObject(request.intentExtras, 0)
                        marshall()
                    }
                } else null
                put("intent_extras", extrasBlob)
            }
        insertWithOnConflict(
            "resurrection_requests",
            null,
            requestContent,
            SQLiteDatabase.CONFLICT_REPLACE
        )

        delete(
            "requested_notifiers",
            "component_package = ? AND component_class = ?",
            arrayOf(
                request.componentName.packageName,
                request.componentName.className
            )
        )

        val notifierValues = ContentValues()
        request.notifyOn.forEach {
            notifierValues.put(
                "component_package",
                request.componentName.packageName
            )
            notifierValues.put(
                "component_class",
                request.componentName.className
            )
            notifierValues.put("notification_key", it.toString())
            insert("requested_notifiers", null, notifierValues)
        }
    }

    /** Unregisters a [component] for resurrection. */
    fun unregisterRequest(component: ComponentName) = writableDatabase.useTransaction {
        val componentArgs = arrayOf(component.packageName, component.className)
        execSQL(
            """
                DELETE FROM requested_notifiers 
                WHERE component_package = ? AND component_class = ?
            """,
            componentArgs
        )
        execSQL(
            """
                DELETE FROM resurrection_requests
                WHERE component_package = ? AND component_class = ?
            """,
            componentArgs
        )
    }

    /**
     * Gets all registered [ResurrectionRequest]s from the database.
     */
    fun getRegistrations(): List<ResurrectionRequest> {
        val notifiersByComponentName = mutableMapOf<ComponentName, MutableList<StorageKey>>()
        val result = mutableListOf<ResurrectionRequest>()

        readableDatabase.useTransaction {
            rawQuery(
                """
                    SELECT 
                        component_package, component_class, notification_key 
                    FROM requested_notifiers
                """.trimIndent(),
                null
            ).use {
                while (it.moveToNext()) {
                    val componentName = ComponentName(it.getString(0), it.getString(1))
                    val key = it.getString(2)

                    val notifiers = notifiersByComponentName[componentName] ?: mutableListOf()
                    notifiers.add(StorageKeyParser.parse(key))
                    notifiersByComponentName[componentName] = notifiers
                }
            }

            rawQuery(
                """
                    SELECT 
                        component_package, 
                        component_class, 
                        component_type, 
                        intent_action, 
                        intent_extras 
                    FROM resurrection_requests
                """.trimIndent(),
                null
            ).use {
                while (it.moveToNext()) {
                    val componentName = ComponentName(it.getString(0), it.getString(1))
                    val type = ResurrectionRequest.ComponentType.valueOf(it.getString(2))
                    val action = if (it.isNull(3)) null else it.getString(3)
                    val extras = if (it.isNull(4)) null else {
                        with(Parcel.obtain()) {
                            val bytes = it.getBlob(4)
                            unmarshall(bytes, 0, bytes.size)
                            setDataPosition(0)
                            readTypedObject(PersistableBundle.CREATOR)
                        }
                    }

                    result.add(
                        ResurrectionRequest(
                            componentName,
                            type,
                            action,
                            extras?.deepCopy(),
                            notifiersByComponentName[componentName] ?: emptyList()
                        )
                    )
                }
            }
        }
        return result
    }

    /** Resets the registrations by deleting everything from the database. */
    fun reset() {
        writableDatabase.useTransaction {
            execSQL("DELETE FROM requested_notifiers")
            execSQL("DELETE FROM resurrection_requests")
        }
    }

    private inline fun <T : Any?> SQLiteDatabase.useTransaction(block: SQLiteDatabase.() -> T): T =
        use { transaction(block) }

    private inline fun <T : Any?> SQLiteDatabase.transaction(block: SQLiteDatabase.() -> T): T {
        beginTransaction()
        return try {
            block().also {
                setTransactionSuccessful()
            }
        } finally {
            endTransaction()
        }
    }

    companion object {
        internal const val RESURRECTION_DB_NAME = "resurrection.sqlite3"
        private const val RESURRECTION_DB_VERSION = 1

        private val CREATE = arrayOf(
            """
                CREATE TABLE resurrection_requests (
                    component_package TEXT NOT NULL,
                    component_class TEXT NOT NULL,
                    component_type TEXT NOT NULL,
                    intent_action TEXT,
                    intent_extras BLOB,
                    PRIMARY KEY (component_package, component_class)
                )
            """.trimIndent(),
            """
                CREATE TABLE requested_notifiers (
                    component_package TEXT NOT NULL,
                    component_class TEXT NOT NULL,
                    notification_key TEXT NOT NULL
                )
            """.trimIndent(),
            """
                CREATE INDEX notifiers_by_component 
                ON requested_notifiers (
                    component_package, 
                    component_class
                )
            """.trimIndent()
        )
    }
}
