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

package arcs.core.storage

import arcs.core.storage.api.DriverAndKeyConfigurator
import arcs.core.storage.keys.RamDiskStorageKey
import com.google.common.truth.Truth.assertThat
import java.util.concurrent.Executors
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.asCoroutineDispatcher
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

/** Tests for [StorageKeyParser]. */
@ExperimentalCoroutinesApi
@RunWith(JUnit4::class)
class StorageKeyParserTest {
    @Test
    fun addParser_registersParser() {
        StorageKeyParser.reset(MyStorageKey)

        val parsed = StorageKeyParser.parse("myParser://foo/bar")
        assertThat(parsed).isInstanceOf(MyStorageKey::class.java)
        assertThat((parsed as MyStorageKey).components).containsExactly("foo", "bar")
    }

    @Test
    fun reset_resetsToDefaults() {
        StorageKeyParser.addParser(MyStorageKey)

        StorageKeyParser.reset()
        var thrownError: Exception? = null
        try {
            StorageKeyParser.parse("myParser://foo")
        } catch (e: Exception) {
            thrownError = e
        }

        assertThat(thrownError).isInstanceOf(IllegalArgumentException::class.java)
    }

    @Test
    fun testRegistrationRacing() = runBlocking<Unit> {
        DriverAndKeyConfigurator.configureKeyParsers()
        val threadOne = Executors.newSingleThreadExecutor().asCoroutineDispatcher()
        val threadTwo = Executors.newSingleThreadExecutor().asCoroutineDispatcher()
        launch(threadOne) {
            (1..1000).forEach { _ ->
                DriverAndKeyConfigurator.configureKeyParsers()
            }
        }
        launch(threadTwo) {
            (1..1000).forEach {
                StorageKeyParser.parse("${RamDiskStorageKey.protocol}://someKey")
            }
        }
    }

    data class MyStorageKey(val components: List<String>) : StorageKey("myParser") {
        override fun toKeyString(): String = components.joinToString("/")

        override fun childKeyWithComponent(component: String): StorageKey =
            MyStorageKey(components + listOf(component))

        companion object : StorageKeySpec<MyStorageKey> {
            override val protocol = "myParser"

            override fun parse(rawKeyString: String) =
                MyStorageKey(rawKeyString.split("/"))
        }
    }
}
