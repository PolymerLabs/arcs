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
package arcs.jvm.host

import arcs.core.host.ArcHost
import kotlin.reflect.KClass

/**
 * [TargetHost] is used on non-manually registered [Particle]s to register them with a specific
 * [ArcHost]. A manually registered [Particle] does not use this annotation and is typically
 * registered in the code that instantiates the [ArcHost].
 */
@Target(AnnotationTarget.CLASS)
@Retention(AnnotationRetention.RUNTIME)
annotation class TargetHost(val value: KClass<out ArcHost>)
