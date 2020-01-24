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
