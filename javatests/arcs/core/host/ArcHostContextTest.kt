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
package arcs.core.host

import arcs.core.data.Plan
import arcs.core.entity.Handle
import arcs.core.host.api.Particle
import arcs.core.storage.StorageProxy.StorageEvent
import com.nhaarman.mockitokotlin2.mock
import com.nhaarman.mockitokotlin2.times
import com.nhaarman.mockitokotlin2.verify
import com.nhaarman.mockitokotlin2.verifyNoMoreInteractions
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.runBlocking
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4
import org.mockito.Mock
import org.mockito.MockitoAnnotations

@RunWith(JUnit4::class)
@OptIn(ExperimentalCoroutinesApi::class)
open class ArcHostContextTest {

    @Mock private lateinit var particle: Particle
    private var planParticle = Plan.Particle("name", "location", mapOf())

    @Before
    fun setup() {
        MockitoAnnotations.initMocks(this)
    }

    @Test
    fun particleContext_writeOnlyParticle() = runBlocking {
        val context = ParticleContext(particle, planParticle)
        context.notifyWriteOnlyParticles()
        verify(particle).onReady()
    }

    @Test
    fun particleContext_singleReadHandle() = runBlocking {
        val context = ParticleContext(particle, planParticle)
        val handle = mock<Handle>().also { context.expectReady(it) }

        context.notifyWriteOnlyParticles()
        verifyNoMoreInteractions(particle)

        context.notify(StorageEvent.READY, handle)
        verify(particle).onReady()

        context.notify(StorageEvent.UPDATE, handle)
        verify(particle).onUpdate()

        context.notify(StorageEvent.DESYNC, handle)
        verify(particle).onDesync()

        context.notify(StorageEvent.RESYNC, handle)
        verify(particle).onResync()
    }

    @Test
    fun particleContext_multipleReadHandles() = runBlocking {
        val context = ParticleContext(particle, planParticle)
        val handle1 = mock<Handle>().also { context.expectReady(it) }
        val handle2 = mock<Handle>().also { context.expectReady(it) }
        val handle3 = mock<Handle>().also { context.expectReady(it) }

        context.notifyWriteOnlyParticles()
        verifyNoMoreInteractions(particle)

        // All handle.onReady calls are required for particle.onReady
        context.notify(StorageEvent.READY, handle1)
        context.notify(StorageEvent.READY, handle2)
        context.notify(StorageEvent.READY, handle3)
        verify(particle).onReady()

        // Every handle.onUpdate triggers particle.onUpdate
        context.notify(StorageEvent.UPDATE, handle1)
        context.notify(StorageEvent.UPDATE, handle2)
        context.notify(StorageEvent.UPDATE, handle3)
        verify(particle, times(3)).onUpdate()

        // Only the first handle.onDesync triggers particle.onDesync
        // All handle.onResyncs are required for particle.onResync
        context.notify(StorageEvent.DESYNC, handle1)
        verify(particle).onDesync()

        context.notify(StorageEvent.DESYNC, handle2)
        context.notify(StorageEvent.RESYNC, handle1)
        context.notify(StorageEvent.DESYNC, handle3)
        context.notify(StorageEvent.RESYNC, handle2)
        verifyNoMoreInteractions(particle)

        context.notify(StorageEvent.RESYNC, handle3)
        verify(particle).onResync()
    }
}
