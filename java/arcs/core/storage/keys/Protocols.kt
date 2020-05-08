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

package arcs.core.storage.keys

/** All supported Arcs storage protocols. */
object Protocols {
    /** Protocol to be used with the database driver */
    const val DATABASE_DRIVER = "db"

    /** Protocol to be used with the database driver for in-memory databases. */
    const val MEMORY_DATABASE_DRIVER = "memdb"

    /** Protocol to be used with the ramdisk driver. */
    const val RAMDISK_DRIVER = "ramdisk"

    /** Protocol to be used with the volatile driver. */
    const val VOLATILE_DRIVER = "volatile"
}
