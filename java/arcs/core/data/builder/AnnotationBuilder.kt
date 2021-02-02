/*
 * Copyright 2021 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */
package arcs.core.data.builder

import arcs.core.data.Annotation
import arcs.core.data.AnnotationParam

/**
 * Builds an [Annotation] with the supplied [name], using an [AnnotationBuilder] [block].
 *
 * Example:
 *
 * ```kotlin
 * val foo = annotation("ttl") {
 *   param("duration", "15 days")
 * }
 * val bar = annotation("encrypted")
 * ```
 */
fun annotation(name: String, block: AnnotationBuilder.() -> Unit = {}): Annotation =
  AnnotationBuilder(name).apply(block).build()

@DataDsl
class AnnotationBuilder(private val name: String) {
  private val params = mutableMapOf<String, AnnotationParam>()

  /**
   * Adds an [AnnotationParam] to the [Annotation] being built.
   *
   * The [value] supplied must be either [String], [Int], or [Boolean]: to match the allowable
   * types of [AnnotationParam].
   */
  fun param(name: String, value: String): AnnotationBuilder {
    val param = AnnotationParam.Str(value)
    params[name] = param
    return this
  }

  /**
   * Adds an [AnnotationParam] to the [Annotation] being built.
   *
   * The [value] supplied must be either [String], [Int], or [Boolean]: to match the allowable
   * types of [AnnotationParam].
   */
  fun param(name: String, value: Int): AnnotationBuilder {
    val param = AnnotationParam.Num(value)
    params[name] = param
    return this
  }

  /**
   * Adds an [AnnotationParam] to the [Annotation] being built.
   *
   * The [value] supplied must be either [String], [Int], or [Boolean]: to match the allowable
   * types of [AnnotationParam].
   */
  fun param(name: String, value: Boolean): AnnotationBuilder {
    val param = AnnotationParam.Bool(value)
    params[name] = param
    return this
  }

  fun build(): Annotation = Annotation(name, params.toMap())
}
