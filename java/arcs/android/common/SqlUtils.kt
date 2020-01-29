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

package arcs.android.common

import android.database.Cursor
import android.database.sqlite.SQLiteDatabase

inline fun <T : Any?> SQLiteDatabase.useTransaction(block: SQLiteDatabase.() -> T): T =
    use { transaction(block) }

inline fun <T : Any?> SQLiteDatabase.transaction(block: SQLiteDatabase.() -> T): T {
    beginTransaction()
    return try {
        block().also {
            setTransactionSuccessful()
        }
    } finally {
        endTransaction()
    }
}

/**
 * Helper function for iterating over each row in the results of a query.
 *
 * Closes the [Cursor] after execution.
 *
 * Usage:
 *
 * ```kotlin
 * database.rawQuery("SELECT name, age FROM users", emptyArray()).forEach {
 *     ageMap[it.getString(0)] = it.getLong(1)
 * }
 * ```
 */
inline fun Cursor.forEach(block: (Cursor) -> Unit) {
    while (moveToNext()) {
        block(this)
    }
    close()
}

/**
 * Helper function for mapping each row in the results of a query.
 *
 * Closes the [Cursor] after execution.
 *
 * Usage:
 *
 * ```kotlin
 * val names = database.rawQuery("SELECT name FROM users", emptyArray())
 *     .map { it.getString(0) }
 * ```
 */
inline fun <T> Cursor.map(block: (Cursor) -> T): List<T> {
    val result = mutableListOf<T>()
    forEach { result.add(block(it)) }
    // forEach will close it for us, but our static analyser doesn't realise that...
    close()
    return result
}
