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

package arcs.core.data.util

import arcs.core.common.Referencable
import arcs.core.common.ReferenceId
import arcs.core.util.Base64
import arcs.core.util.toBase64Bytes
import kotlin.reflect.KClass

/**
 * Represents a primitive which can be referenced - and thus used by Crdts.
 */
data class ReferencablePrimitive<T>(
    /** Type of primitive being referencable-ified. */
    private val klass: KClass<*>,
    /** The actual value. */
    val value: T,
    /**
     * A string-representation of the value, when `value.toString()` is unwieldy (e.g. ByteArrays).
     */
    val valueRepr: String = value.toString()
) : Referencable {
    // TODO: consider other 'serialization' mechanisms.
    override val id: ReferenceId = "Primitive<$klass>($valueRepr)"

    override fun toString(): String = "Primitive($valueRepr)"

    override fun hashCode(): Int = id.hashCode()

    override fun equals(other: Any?): Boolean {
        val otherRef = other as? Referencable ?: return false
        return otherRef.id == id
    }

    companion object {
        private val pattern = "Primitive<([^>]+)>\\((.*)\\)$".toRegex()

        /** Returns whether or not the given type is a supported type for [ReferencablePrimitive]. */
        fun isSupportedPrimitive(klass: KClass<*>): Boolean =
            klass == Int::class ||
                klass == Float::class ||
                klass == Double::class ||
                klass == String::class ||
                klass == Boolean::class ||
                klass == ByteArray::class

        /**
         * If the given [ReferenceId] matches the type of `serialized` reference id created by
         * [ReferencablePrimitive], this will return an instance of [ReferencablePrimitive].
         */
        fun tryDereference(id: ReferenceId): Referencable? {
            val match = pattern.matchEntire(id) ?: return null
            val className = match.groups[1]?.value ?: return null
            val value = match.groups[2]?.value ?: return null

            return when {
                className == Int::class.toString() ||
                className.contains("java.lang.Int") ->
                    ReferencablePrimitive(Double::class, value.toDouble())
                className == Float::class.toString() ||
                className.contains("java.lang.Float") ->
                    ReferencablePrimitive(Double::class, value.toDouble())
                className == Double::class.toString() ||
                className.contains("java.lang.Double") ->
                    ReferencablePrimitive(Double::class, value.toDouble())
                className == String::class.toString() ->
                    ReferencablePrimitive(String::class, value)
                className == Boolean::class.toString() ||
                className.contains("java.lang.Boolean") ->
                    ReferencablePrimitive(Boolean::class, value.toBoolean())
                className == ByteArray::class.toString() ->
                    ReferencablePrimitive(ByteArray::class, value.toBase64Bytes(), value)
                else -> null
            }
        }
    }
}

/* Extension functions to make conversion easy. */

/** Makes a [Double]-based [ReferencablePrimitive] from the receiving [Int]. */
fun Int.toReferencable(): ReferencablePrimitive<Double> =
    ReferencablePrimitive(Double::class, this.toDouble())

/** Makes a [Double]-based [ReferencablePrimitive] from the receiving [Float]. */
fun Float.toReferencable(): ReferencablePrimitive<Double> =
    ReferencablePrimitive(Double::class, this.toDouble())

/** Makes a [Double]-based [ReferencablePrimitive] from the receiving [Double]. */
fun Double.toReferencable(): ReferencablePrimitive<Double> =
    ReferencablePrimitive(Double::class, this)

/** Makes a [String]-based [ReferencablePrimitive] from the receiving [String]. */
fun String.toReferencable(): ReferencablePrimitive<String> =
    ReferencablePrimitive(String::class, this)

/** Makes a [Boolean]-based [ReferencablePrimitive] from the receiving [Boolean]. */
fun Boolean.toReferencable(): ReferencablePrimitive<Boolean> =
    ReferencablePrimitive(Boolean::class, this)

/**
 * Makes a [ByteArray]-based [ReferencablePrimitive] from the receiving [ByteArray], with the
 * [ReferencablePrimitive.valueRepr] equal to the Base64 encoding of the array.
 */
fun ByteArray.toReferencable(): ReferencablePrimitive<ByteArray> =
    ReferencablePrimitive(ByteArray::class, this, Base64.encode(this))
