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
import arcs.android.common.forEach
import arcs.android.common.map
import arcs.android.common.transaction
import arcs.core.storage.StorageKey
import arcs.core.storage.StorageKeyParser
import arcs.core.storage.api.DriverAndKeyConfigurator

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
        DriverAndKeyConfigurator.configureKeyParsers()
    }

    override fun onCreate(db: SQLiteDatabase) {
        db.transaction { CREATE.forEach(db::execSQL) }
    }

    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) = db.transaction {
        val upgradeRange = (oldVersion + 1)..newVersion
        if (2 in upgradeRange) {
            VERSION_2_MIGRATION.forEach(db::execSQL)
        }
    }

    /**
     * Stores a [ResurrectionRequest] in the database.
     */
    fun registerRequest(request: ResurrectionRequest) = writableDatabase.transaction {
        val requestContent = ContentValues()
            .apply {
                put("component_package", request.componentName.packageName)
                put("component_class", request.componentName.className)
                put("component_type", request.componentType.name)
                put("target_id", request.targetId)
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
            "component_package = ? AND component_class = ? AND target_id = ?",
            arrayOf(
                request.componentName.packageName,
                request.componentName.className,
                request.targetId
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
            notifierValues.put(
                "target_id",
                request.targetId
            )
            notifierValues.put("notification_key", it.toString())
            insert("requested_notifiers", null, notifierValues)
        }
    }

    /** Unregisters a [component] for resurrection. */
    fun unregisterRequest(
        component: ComponentName,
        targetId: String
    ) = writableDatabase.transaction {
        val deletionArgs = arrayOf(component.packageName, component.className, targetId)
        execSQL(
            """
                DELETE FROM requested_notifiers 
                WHERE component_package = ? AND component_class = ? AND target_id = ?
            """,
            deletionArgs
        )
        execSQL(
            """
                DELETE FROM resurrection_requests
                WHERE component_package = ? AND component_class = ? AND target_id = ?
            """,
            deletionArgs
        )
    }

    private data class RequestedNotifier(val targetId: String, val component: ComponentName)

    /**
     * Gets all registered [ResurrectionRequest]s from the database.
     */
    fun getRegistrations(): List<ResurrectionRequest> {
        val notifiersByComponentName =
            mutableMapOf<RequestedNotifier, MutableList<StorageKey>>()
        return readableDatabase.transaction {
            rawQuery(
                """
                    SELECT 
                        component_package, component_class, notification_key, target_id 
                    FROM requested_notifiers
                """.trimIndent(),
                null
            ).forEach {
                val componentName = ComponentName(it.getString(0), it.getString(1))
                val key = it.getString(2)
                val targetId = it.getString(3)

                val requestedNotifier = RequestedNotifier(targetId, componentName)
                val notifiers =
                    notifiersByComponentName[requestedNotifier]
                        ?: mutableListOf()
                notifiers.add(StorageKeyParser.parse(key))
                notifiersByComponentName[requestedNotifier] = notifiers
            }

            rawQuery(
                """
                    SELECT 
                        component_package, 
                        component_class, 
                        component_type, 
                        intent_action, 
                        intent_extras,
                        target_id
                    FROM resurrection_requests
                """.trimIndent(),
                null
            ).map {
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
                val targetId = it.getString(5)

                ResurrectionRequest(
                    componentName,
                    type,
                    action,
                    extras?.deepCopy(),
                    targetId,
                    notifiersByComponentName[RequestedNotifier(targetId, componentName)]
                        ?: emptyList()
                )
            }
        }
    }

    /** Resets the registrations by deleting everything from the database. */
    fun reset() {
        writableDatabase.transaction {
            execSQL("DELETE FROM requested_notifiers")
            execSQL("DELETE FROM resurrection_requests")
        }
    }

    companion object {
        internal const val RESURRECTION_DB_NAME = "resurrection.sqlite3"
        private const val RESURRECTION_DB_VERSION = 2

        private val CREATE = arrayOf(
            """
                CREATE TABLE resurrection_requests (
                    component_package TEXT NOT NULL,
                    component_class TEXT NOT NULL,
                    component_type TEXT NOT NULL,
                    target_id TEXT NOT NULL,
                    intent_action TEXT,
                    intent_extras BLOB,
                    PRIMARY KEY (component_package, component_class, target_id)
                )
            """.trimIndent(),
            """
                CREATE TABLE requested_notifiers (
                    component_package TEXT NOT NULL,
                    component_class TEXT NOT NULL,
                    target_id TEXT NOT NULL,
                    notification_key TEXT NOT NULL
                )
            """.trimIndent(),
            """
                CREATE INDEX notifiers_by_component_and_id
                ON requested_notifiers (
                    component_package, 
                    component_class,
                    target_id
                )
            """.trimIndent()
        )

        private val VERSION_2_MIGRATION = arrayOf(
            "DROP TABLE resurrection_requests",
            "DROP TABLE requested_notifiers",
            "DROP TABLE notifiers_by_component"
        ) + CREATE
    }
}
