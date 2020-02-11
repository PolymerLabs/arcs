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
import arcs.core.storage.database.Database
import arcs.core.storage.database.DatabaseFactory
import arcs.core.util.guardedBy
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/**
 * [DatabaseFactory] implementation which constructs [DatabaseImpl] instances for use on Android
 * with SQLite.
 */
class AndroidSqliteDatabaseFactory(context: Context) : DatabaseFactory {
    private val context = context.applicationContext
    private val mutex = Mutex()
    private val dbCache by guardedBy(mutex, mutableMapOf<Pair<String, Boolean>, Database>())

    override suspend fun getDatabase(name: String, persistent: Boolean): Database = mutex.withLock {
        dbCache[name to persistent]
            ?: DatabaseImpl(context, name, persistent).also { dbCache[name to persistent] = it }
    }
}
