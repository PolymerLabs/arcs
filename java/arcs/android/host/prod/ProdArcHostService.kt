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
package arcs.android.host.prod

import android.content.Context
import androidx.annotation.VisibleForTesting
import androidx.lifecycle.Lifecycle
import arcs.android.sdk.host.AndroidHost
import arcs.android.sdk.host.ArcHostService
import arcs.core.host.ArcHost
import arcs.core.host.HandleManagerProvider
import arcs.core.host.ParticleRegistration
import arcs.core.host.ProdHost
import arcs.jvm.host.scanForParticles
import kotlin.coroutines.CoroutineContext
import kotlinx.coroutines.ExperimentalCoroutinesApi

/**
 * An isolatable (can run in another process) [Service] that has a [ProdHost] inside. [Particle]
 * implementations wishing to run inside of this [Prod] should use `arcs_kt_particles` macro
 * to make themselves automatically discoverable by ProdHost.
 */
@ExperimentalCoroutinesApi
@VisibleForTesting(otherwise = VisibleForTesting.PRIVATE)
abstract class ProdArcHostService : ArcHostService() {

    @ExperimentalCoroutinesApi
    class ProdAndroidHost(
        context: Context,
        lifecycle: Lifecycle,
        coroutineContext: CoroutineContext,
        arcSerializationCoroutineContext: CoroutineContext,
        handleManagerProvider: HandleManagerProvider,
        vararg particles: ParticleRegistration
    ) : AndroidHost(
        context = context,
        lifecycle = lifecycle,
        coroutineContext = coroutineContext,
        arcSerializationContext = arcSerializationCoroutineContext,
        handleManagerProvider = handleManagerProvider,
        particles = *particles
    ), ProdHost

    /** This is the [CoroutineContext] used for resurrection jobs on the [AbstractArcHost]s. */
    abstract val coroutineContext: CoroutineContext

    /** This is the [CoroutineContext] used for arc state storage on the [AbstractArcHost]s. */
    abstract val arcSerializationCoroutineContext: CoroutineContext
    abstract val handleManagerProvider: HandleManagerProvider
    /**
     * This is open for tests to override, but normally isn't necessary.
     */
    override val arcHost: ArcHost by lazy {
        ProdAndroidHost(
            context = this,
            lifecycle = lifecycle,
            coroutineContext = coroutineContext,
            arcSerializationCoroutineContext = arcSerializationCoroutineContext,
            handleManagerProvider = handleManagerProvider,
            particles = *scanForParticles()
        )
    }

    override val arcHosts by lazy { listOf(arcHost) }
}
