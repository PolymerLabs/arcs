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

package arcs.sdk.jvm

import arcs.sdk.Particle
import arcs.sdk.CollectionImpl
import com.google.common.truth.Truth.assertThat
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4
import org.mockito.Mock
import org.mockito.Mockito.verify
import org.mockito.MockitoAnnotations

@RunWith(JUnit4::class)
class CollectionImplTest {

    private lateinit var collection: CollectionImpl<DummyEntity>
    @Mock private lateinit var particle: Particle

    private val HANDLE_NAME = "HANDLE_NAME"
    private val DUMMY_VALUE1 = DummyEntity("111")
    private val DUMMY_VALUE2 = DummyEntity("222")

    @Before
    fun setUp() {
        MockitoAnnotations.initMocks(this)
        collection = CollectionImpl(particle, HANDLE_NAME, DummyEntity.Spec())
    }

    @Test
    fun initialState() {
        assertThat(collection.name).isEqualTo(HANDLE_NAME)
        assertThat(collection.size).isEqualTo(0)
        assertThat(collection.isEmpty()).isTrue()
        assertThat(collection.fetchAll()).isEmpty()
    }

    @Test
    fun store_addsElement() {
        collection.store(DUMMY_VALUE1)

        assertThat(collection.size).isEqualTo(1)
        assertThat(collection.isEmpty()).isFalse()
        assertThat(collection.fetchAll()).containsExactly(DUMMY_VALUE1)
    }

    @Test
    fun store_canAddMultipleValues() {
        collection.store(DUMMY_VALUE1)
        collection.store(DUMMY_VALUE2)

        assertThat(collection.size).isEqualTo(2)
        assertThat(collection.isEmpty()).isFalse()
        assertThat(collection.fetchAll()).containsExactly(DUMMY_VALUE1, DUMMY_VALUE2)
    }

    @Test
    fun store_updatesParticle() {
        collection.store(DUMMY_VALUE1)
        verify(particle).onHandleUpdate(collection)
    }

    @Test
    fun remove_removesSingleValue() {
        collection.store(DUMMY_VALUE1)
        collection.store(DUMMY_VALUE2)

        collection.remove(DUMMY_VALUE2)

        assertThat(collection.size).isEqualTo(1)
        assertThat(collection.isEmpty()).isFalse()
        assertThat(collection.fetchAll()).containsExactly(DUMMY_VALUE1)
    }

    @Test
    fun remove_updatesParticle() {
        collection.remove(DUMMY_VALUE2)
        verify(particle).onHandleUpdate(collection)
    }

    @Test
    fun clear_removesMultipleValues() {
        collection.store(DUMMY_VALUE1)
        collection.store(DUMMY_VALUE2)

        collection.clear()

        assertThat(collection.size).isEqualTo(0)
        assertThat(collection.isEmpty()).isTrue()
        assertThat(collection.fetchAll()).isEmpty()
    }

    @Test
    fun clear_updatesParticle() {
        collection.clear()
        verify(particle).onHandleUpdate(collection)
    }
}
