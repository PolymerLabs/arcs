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
import arcs.sdk.SingletonImpl
import arcs.sdk.SingletonWrapper
import com.google.common.truth.Truth.assertThat
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4
import org.mockito.ArgumentMatchers.any
import org.mockito.Mock
import org.mockito.Mockito.verify
import org.mockito.MockitoAnnotations

@RunWith(JUnit4::class)
class SingletonImplTest {

    private lateinit var singleton: SingletonImpl<DummyEntity>
    @Mock private lateinit var particle: Particle
    @Mock private lateinit var action: (DummyEntity?) -> Unit

    private val HANDLE_NAME = "HANDLE_NAME"
    private val DUMMY_VALUE = DummyEntity("123")

    @Before
    fun setUp() {
        MockitoAnnotations.initMocks(this)
        singleton = SingletonWrapper(SingletonImpl(particle, HANDLE_NAME, DummyEntity.Spec()))
        singleton.onUpdate(action)
    }

    @Test
    fun initialState() {
        assertThat(singleton.name).isEqualTo(HANDLE_NAME)
        assertThat(singleton.fetch()).isNull()
    }

    @Test
    fun set_changesValue() {
        singleton.set(DUMMY_VALUE)
        assertThat(singleton.fetch()).isEqualTo(DUMMY_VALUE)
    }

    @Test
    fun set_updatesParticle() {
        singleton.set(DUMMY_VALUE)
        verify(particle).onHandleUpdate(singleton)
    }

    @Test
    fun clear_changesValue() {
        singleton.set(DUMMY_VALUE)
        singleton.clear()
        assertThat(singleton.fetch()).isNull()
    }

    @Test
    fun clear_updatesParticle() {
        singleton.clear()
        verify(particle).onHandleUpdate(singleton)
    }

    @Test
    fun set_updatesHandle() {
        singleton.set(DUMMY_VALUE)
        verify(action).invoke(DUMMY_VALUE)
    }

    @Test
    fun clear_updatesHandle() {
        singleton.clear()
        verify(action).invoke(null)
    }

}
