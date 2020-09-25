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

/** Implementation of [Particle] for the JVM. */
abstract class BaseParticle : Particle {
  /**
   * Default behaviour is to automatically invoke onUpdate; override this if you want
   * resync-specific behaviour. When overriding, do not call super.onResync.
   */
  override fun onResync() = onUpdate()
}
