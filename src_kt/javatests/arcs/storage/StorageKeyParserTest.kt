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

package arcs.storage

import com.google.common.truth.Truth.assertThat
import org.junit.After
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4
import java.lang.Exception

/** Tests for [StorageKeyParser]. */
@RunWith(JUnit4::class)
class StorageKeyParserTest {
  @After
  fun teardown() {
    StorageKeyParser.reset()
  }

  @Test
  fun addParser_registersParser() {
    StorageKeyParser.addParser("myParser") {
      MyStorageKey(it.split("/")) // dummy.
    }

    val parsed = StorageKeyParser.parse("myParser://foo/bar")
    assertThat(parsed).isInstanceOf(MyStorageKey::class.java)
    assertThat((parsed as MyStorageKey).components).containsExactly("foo", "bar")
  }

  @Test
  fun reset_resetsToDefaults() {
    StorageKeyParser.addParser("myParser") {
      MyStorageKey(it.split("/")) // dummy.
    }
    StorageKeyParser.reset()

    var thrownError: Exception? = null
    try {
      StorageKeyParser.parse("myParser://foo")
    } catch (e: Exception) {
      thrownError = e
    }

    assertThat(thrownError).isInstanceOf(IllegalArgumentException::class.java)
  }

  data class MyStorageKey(val components: List<String>) : StorageKey("myParser") {
    override fun toKeyString(): String = components.joinToString("/")

    override fun childKeyWithComponent(component: String): StorageKey =
      MyStorageKey(components + listOf(component))
  }
}
