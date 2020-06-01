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
import android.database.sqlite.SQLiteProgram

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
inline fun Cursor.forEach(block: (Cursor) -> Unit) = use {
    while (moveToNext()) {
        block(this)
    }
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
inline fun <T> Cursor.map(block: (Cursor) -> T): List<T> = use {
    val result = mutableListOf<T>()
    forEach { result.add(block(it)) }
    result
}

/**
 * Helper function for retrieving a single optional row from a query. Fails if there is more than
 * one result.
 *
 * Closes the [Cursor] after execution.
 *
 * Usage:
 *
 * ```kotlin
 * val name: String? = database.rawQuery("SELECT name FROM users WHERE id = ?", emptyArray(123))
 *     .forSingleResult { it.getString(0) }
 * ```
 */
inline fun <T> Cursor.forSingleResult(block: (Cursor) -> T?): T? = use {
    require(count == 0 || count == 1) { "Expected 0 or 1 results, found $count." }
    if (moveToFirst()) block(it) else null
}

/**
 * Returns the value of the requested column as a boolean. The column data must be a long with value
 * either 0 or 1.
 */
fun Cursor.getBoolean(i: Int) = getLong(i).toBoolean()

/** Returns a nullable [String] from the requested column. */
fun Cursor.getNullableString(i: Int) = if (isNull(i)) null else getString(i)

/** Returns a nullable [Double] from the requested column. */
fun Cursor.getNullableDouble(i: Int) = if (isNull(i)) null else getDouble(i)

/** Returns a nullable [Boolean] from the requested column. */
fun Cursor.getNullableBoolean(i: Int) = if (isNull(i)) null else getBoolean(i)

/**
 * Bind a boolean value to this statement. The value will be converted to a long with value either 0
 * or 1.
 */
fun SQLiteProgram.bindBoolean(i: Int, value: Boolean) = bindLong(i, value.toLong())

private fun Long.toBoolean() = when (this) {
    0L -> false
    1L -> true
    else -> throw IllegalArgumentException(
        "Could not convert $this to Boolean, expected 0 or 1."
    )
}

private fun Boolean.toLong() = when (this) {
    false -> 0L
    true -> 1L
}
