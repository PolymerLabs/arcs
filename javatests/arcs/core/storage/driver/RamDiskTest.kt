/*
 * Copyright 2019 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */

package arcs.core.storage.driver

import arcs.core.storage.keys.RamDiskStorageKey
import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

/** Tests for [RamDisk] (the actual singleton). */
@RunWith(JUnit4::class)
class RamDiskTest {
    @Test
    fun clear_clearsStorage() {
        val key = RamDiskStorageKey("myData")
        RamDisk.memory[key] = VolatileEntry("hello")

        RamDisk.clear()
        assertThat(key !in RamDisk.memory).isTrue()
    }
}
