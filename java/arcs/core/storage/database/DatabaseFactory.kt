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

package arcs.core.storage.database

/**
 * Defines an abstract factory capable of instantiating (or re-using, when necessary) a [Database].
 */
// TODO: In the future it may be important for there to be an additional parameter on getDatabase
//  which hints the factory as to where the database should be found (e.g. a remote server, a local
//  service like postgres, android sqlite database, non-android sqlite database, WebDatabase, etc..)
interface DatabaseFactory {
    /**
     * Gets a [Database] for the given [name].  If [persistent] is `false`, the [Database] should
     * only exist in-memory (if possible for the current platform).
     */
    suspend fun getDatabase(name: String, persistent: Boolean): Database
}
