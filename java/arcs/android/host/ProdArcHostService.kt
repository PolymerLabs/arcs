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
package arcs.android.host

import android.content.Context
import androidx.lifecycle.Lifecycle
import arcs.android.sdk.host.AndroidHost
import arcs.android.sdk.host.ArcHostService
import arcs.core.host.ArcHost
import arcs.core.host.ParticleRegistration
import arcs.core.host.ProdHost
import arcs.jvm.host.scanForParticles

/**
 * Temporary to avoid G3 breakage.
 * TODO: Delete in followup.
 */
open class ProdArcHostService : ArcHostService() {

    class ProdAndroidHost(
        context: Context,
        lifecycle: Lifecycle,
        vararg particles: ParticleRegistration
    ) : AndroidHost(context, lifecycle, *particles), ProdHost

    override val arcHost: ArcHost by lazy {
        ProdAndroidHost(this, this.lifecycle, *scanForParticles())
    }
}
