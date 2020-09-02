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
package arcs.core.host.api

import arcs.core.entity.Handle

/** Base interface for all particles. */
interface Particle {

    /**
     * This field contains a reference to all of the [Particle]'s handles that were declared in
     * the manifest.
     */
    val handles: HandleHolder

    /**
     * Called the first time this [Particle] is instantiated in an [Arc].
     *
     * This should be used to initialize writeable handles to their starting state prior to the
     * arc starting. Readable handles cannot be read in this method.
     */
    fun onFirstStart() = Unit

    /**
     * Called whenever this [Particle] is instantiated, both initially and when an arc is
     * re-started.
     *
     * This should be used to attach any handle-specific actions via [Handle.onReady],
     * [Handle.onUpdate], etc. Readable handles cannot be read in this method.
     */
    fun onStart() = Unit

    /**
     * Called when all readable handles have been synchronized with their storage, or just after
     * [onStart] for write-only particles.
     *
     * Particles should initialize their internal, non-handle state and will generally initiate
     * their main processing logic at this point.
     */
    fun onReady() = Unit

    /**
     * Called when any readable handle is updated.
     *
     * This provides a central event for processing all handle data, whenever a change is observed.
     */
    fun onUpdate() = Unit

    /**
     * Called once when any readable handle is desynchronized from its storage.
     *
     * This will not be called again until after a resync event.
     */
    fun onDesync() = Unit

    /**
     * Called once when all desynchronized handles have recovered.
     *
     * By default this will automatically invoke onUpdate; particles may override this should they
     * want resync-specific behaviour. When overriding, do not call super.onResync.
     */
    fun onResync() = Unit

    /**
     *  Called when an [Arc] is shutdown.
     *
     *  Usually this method is unneeded, however if a platform-specific particle in an external
     *  host is holding on to an expensive resource, for example a UI or service connection on
     *  Android, thus method is provided as a way to release platform specific resources.
     */
    fun onShutdown() = Unit
}
