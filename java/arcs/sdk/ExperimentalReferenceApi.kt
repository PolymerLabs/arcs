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

/**
 * Functions annotated with this are part of the experimental support for de-referencing
 * [Referenece]s within Arcs.
 */
@Suppress("EXPERIMENTAL_IS_NOT_ENABLED") // @Experimental is Experimental in Kotlin...
@Retention(AnnotationRetention.BINARY)
@Experimental(level = Experimental.Level.WARNING)
@Target(AnnotationTarget.FUNCTION)
annotation class ExperimentalReferenceApi
