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

package arcs.data.util

import arcs.common.Referencable
import arcs.common.ReferenceId
import arcs.util.Base64
import arcs.util.toBase64Bytes
import kotlin.reflect.KClass

data class ReferencablePrimitive<T>(private val klass: KClass<*>, val value: T, val valueRepr: String? = null) : Referencable {
    override val id: ReferenceId
        get() = valueRepr?.let { "Primitive<$klass>($it)" } ?: toString()

    override fun toString(): String {
        return "Primitive<$klass>($value)"
    }

    companion object {
        private val pattern = "Primitive<([^>]+)>\\((.*)\\)$".toRegex()

        /** Returns whether or not the given type is a supported type for [ReferencablePrimitive]. */
        fun isSupportedPrimitive(klass: KClass<*>): Boolean =
            klass == Int::class
                || klass == Float::class
                || klass == Double::class
                || klass == String::class
                || klass == Boolean::class
                || klass == ByteArray::class

        fun tryDereference(id: ReferenceId): Referencable? {
            val match = pattern.matchEntire(id) ?: return null
            val className = match.groups[1]?.value ?: return null
            val value = match.groups[2]?.value ?: return null

            return when (className) {
                Int::class.toString() ->
                    ReferencablePrimitive(Int::class, value.toDouble())
                Float::class.toString() ->
                    ReferencablePrimitive(Float::class, value.toDouble())
                Double::class.toString() ->
                    ReferencablePrimitive(Double::class, value.toDouble())
                String::class.toString() ->
                    ReferencablePrimitive(String::class, value)
                Boolean::class.toString() ->
                    ReferencablePrimitive(Boolean::class, value.toBoolean())
                ByteArray::class.toString() ->
                    ReferencablePrimitive(ByteArray::class, value.toBase64Bytes(), value)
                else -> null
            }
        }
    }
}

fun Int.toReferencable(): ReferencablePrimitive<Double> = ReferencablePrimitive(Int::class, this.toDouble())
fun Float.toReferencable(): ReferencablePrimitive<Double> = ReferencablePrimitive(Float::class, this.toDouble())
fun Double.toReferencable(): ReferencablePrimitive<Double> = ReferencablePrimitive(Double::class, this)
fun String.toReferencable(): ReferencablePrimitive<String> = ReferencablePrimitive(String::class, this)
fun Boolean.toReferencable(): ReferencablePrimitive<Boolean> = ReferencablePrimitive(Boolean::class, this)
fun ByteArray.toReferencable(): ReferencablePrimitive<ByteArray> =
    ReferencablePrimitive(ByteArray::class, this, Base64.encode(this))
