/*
 * Copyright 2019 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */

package arcs.crdt.entity

import arcs.common.ReferenceId
import arcs.util.toBase64Bytes
import arcs.util.toBase64String
import kotlin.reflect.KClass
import arcs.crdt.entity.Url as ArcsUrl

/**
 * Creates [FieldValueInterpreter]s for a number of arcs-supported primitives.
 *
 * * Boolean
 * * Number (see the note below)
 * * Text
 * * Url
 *
 * **Note:** In order to use a number, the type used must be of type [Number] (not [Int], [Double],
 * etc). TODO: Try to figure out a better solution for this.
 */
object PrimitiveInterpreters {
  internal val Boolean: Pair<KClass<Boolean>, FieldValueInterpreter<Boolean>> =
    buildInterpreter(kotlin.Boolean::class, "Boolean", kotlin.Boolean::toString, String::toBoolean)
  internal val Number: Pair<KClass<Number>, FieldValueInterpreter<Number>> =
    buildInterpreter(
      kotlin.Number::class,
      "Number",
      // Regardless of which subclass of kotlin.Number, serialize as if it were a Double.
      { toDouble().toString() },
      { toDouble() }
    )
  internal val Text: Pair<KClass<Text>, FieldValueInterpreter<Text>> =
    buildInterpreter(arcs.crdt.entity.Text::class, "Text", String::toJson, String::fromJson)
  internal val Url: Pair<KClass<ArcsUrl>, FieldValueInterpreter<ArcsUrl>> =
    buildInterpreter(
      ArcsUrl::class,
      "URL",
      // Use the string value of the URL.
      { string.toJson() },
      { ArcsUrl(this.fromJson()) }
    )
  internal val Instant: Pair<KClass<Instant>, FieldValueInterpreter<Instant>> =
    buildInterpreter(
      arcs.crdt.entity.Instant::class,
      "Instant",
      arcs.crdt.entity.Instant::toString,
      { toInstant() }
    )
  internal val Bytes: Pair<KClass<Bytes>, FieldValueInterpreter<Bytes>> =
    buildInterpreter(
      arcs.crdt.entity.Bytes::class,
      "Bytes",
      { toBase64String() },
      { toBase64Bytes() },
      { contentHashCode() }
    )

  private fun <T : Any> buildInterpreter(
    kClass: KClass<T>,
    idPrefix: String = kClass.toString(),
    toString: T.() -> String,
    fromString: String.() -> T,
    getHashCode: T.() -> Int = { hashCode() }
  ): Pair<KClass<T>, FieldValueInterpreter<T>> = kClass to object : FieldValueInterpreter<T> {
    override fun getReferenceId(value: T): ReferenceId = "$idPrefix::${value.getHashCode()}"
    override fun serialize(value: T): String = toString(value)
    override fun deserialize(rawValue: String): T = rawValue.fromString()
  }
}

/** Registers [FieldValueInterpreter]s for the supported primitive types. */
fun FieldValueInterpreter.Companion.registerPrimitives() = register(
  PrimitiveInterpreters.Boolean,
  PrimitiveInterpreters.Number,
  PrimitiveInterpreters.Text,
  PrimitiveInterpreters.Url,
  PrimitiveInterpreters.Instant,
  PrimitiveInterpreters.Bytes
)
