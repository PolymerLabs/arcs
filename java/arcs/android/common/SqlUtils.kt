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
import arcs.core.util.ArcsDuration
import arcs.core.util.ArcsInstant
import arcs.core.util.BigInt
import arcs.core.util.toBigInt

inline fun <T : Any?> SQLiteDatabase.transaction(block: SQLiteDatabase.() -> T): T {
  scopedTrace("beginTransaction", ::beginTransaction)
  return try {
    block().also {
      setTransactionSuccessful()
    }
  } finally {
    scopedTrace("endTransaction", ::endTransaction)
  }
}

// SQLite supports a maximum of 999 placeholders, we use a lower number to keep some buffer room.
const val MAX_PLACEHOLDERS = 900

/**
 * Performs a delete operation making sure we respect the limit on the number of placeholders in the
 * where clause. If more than [MAX_PLACEHOLDERS] [whereArgs] are passed, the method splits the
 * delete in multiple smaller deletes.
 *
 * @param table the table to delete from
 * @param whereClause the WHERE clause to apply when deleting, as a lambda that takes the string
 *   sequence of question marks of the appropriate size.
 * @param whereArgs args to the WHERE clause, for which question marks will be created.
 */
fun SQLiteDatabase.batchDelete(
  table: String,
  whereClause: (String) -> String,
  whereArgs: Collection<String>
) {
  whereArgs.chunked(MAX_PLACEHOLDERS).forEach { chunk ->
    delete(table, whereClause(chunk.joinToString { "?" }), chunk.toTypedArray())
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

/** Returns a nullable [Byte] from the requested column. */
fun Cursor.getNullableByte(i: Int) = if (isNull(i)) null else getShort(i).toByte()

/** Returns a nullable [Short] from the requested column. */
fun Cursor.getNullableShort(i: Int) = if (isNull(i)) null else getShort(i)

/** Returns a nullable [Int] from the requested column. */
fun Cursor.getNullableInt(i: Int) = if (isNull(i)) null else getInt(i)

/** Returns a nullable [Long] from the requested column. */
fun Cursor.getNullableLong(i: Int) = if (isNull(i)) null else getString(i).toLong()

/** Returns a nullable [BigInt] from the requested column. */
fun Cursor.getNullableBigInt(i: Int) =
  if (isNull(i)) null else getString(i).toBigInt()

/** Returns a nullable [ArcsInstant] from the requested column. */
fun Cursor.getNullableArcsInstant(i: Int) =
  if (isNull(i)) null else ArcsInstant.ofEpochMilli(getString(i).toLong())

/** Returns a nullable [ArcsDuration] from the requested column. */
fun Cursor.getNullableArcsDuration(i: Int) =
  if (isNull(i)) null else ArcsDuration.ofMillis(getString(i).toLong())

/** Returns a nullable [Float] from the requested column. */
fun Cursor.getNullableFloat(i: Int) = if (isNull(i)) null else getFloat(i)

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
