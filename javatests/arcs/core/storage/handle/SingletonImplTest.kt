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

package arcs.core.storage.handle

import arcs.core.crdt.CrdtSingleton
import com.google.common.truth.Truth.assertThat
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4
import org.mockito.MockitoAnnotations

@RunWith(JUnit4::class)
class SingletonImplTest {

    private lateinit var singleton: SingletonImpl<MockDataItem>

    private val HANDLE_NAME = "HANDLE_NAME"
    private val DUMMY_VALUE = MockDataItem("123")

    @Before
    fun setUp() {
        MockitoAnnotations.initMocks(this)
        val storageProxy = StorageProxy(CrdtSingleton<MockDataItem>())
        singleton = SingletonImpl(HANDLE_NAME, storageProxy)
    }

    @Test
    fun initialState() {
        assertThat(singleton.name).isEqualTo(HANDLE_NAME)
        assertThat(singleton.get()).isNull()
    }

    @Test
    fun set_changesValue() {
        singleton.set(DUMMY_VALUE)
        assertThat(singleton.get()).isEqualTo(DUMMY_VALUE)
    }

    @Test
    fun clear_changesValue() {
        singleton.set(DUMMY_VALUE)
        singleton.clear()
        assertThat(singleton.get()).isNull()
    }
}
