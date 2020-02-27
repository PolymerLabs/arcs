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

package arcs.sdk

import arcs.core.storage.api.HandleLifecycle
import arcs.core.storage.api.ReadableHandleLifecycle

/** Implementation of [Particle] for the JVM. */
abstract class BaseParticle : Particle {
    /**
     * This field contains a reference to all of the [Particle]'s handles that were declared in
     * the manifest.
     */
    abstract val handles: HandleHolder

    /**
     * Used to initialize [BaseParticle] implementations to subscribe to handle lifecycle
     * events and publish them to the [Particle] interface.
     */
    suspend fun onInitialize() {
        val synced = mutableSetOf<Handle>()

        handles.handles.forEach { _, value ->
            val handle = value as HandleLifecycle<Handle>
            handle.onSync {
                synced.add(it)
                this@BaseParticle.onHandleSync(it, synced.size == handles.handles.size)
            }

            handle.onDesync {
                synced.remove(it)
                // particle.onHandleDesync()?
            }

            if (handle is ReadableHandleLifecycle<*, Handle>) {
                handle.onUpdate {
                    this@BaseParticle.onHandleUpdate(handle as Handle)
                }
            }
        }
    }
}
