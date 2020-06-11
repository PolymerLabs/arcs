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
    private val klassRepr = "Primitive<${primitiveKClassMap.getOrElse(klass, klass::toString)}>"
    override val id: ReferenceId
        get() = "$klassRepr($valueRepr)"

    override fun toString(): String = "Primitive($valueRepr)"

    override fun hashCode(): Int = id.hashCode()

    override fun equals(other: Any?): Boolean {
        val otherRef = other as? Referencable ?: return false
        return otherRef.id == id
    }

    companion object {
        // Do not use KClass::toString() as its implementation relies on extremely slow reflection.
        private const val primitiveKotlinByte = "kotlin.Byte"
        private const val primitiveKotlinShort = "kotlin.Short"
        private const val primitiveKotlinInt = "kotlin.Int"
        private const val primitiveKotlinLong = "kotlin.Long"
        private const val primitiveKotlinChar = "kotlin.Char"
        private const val primitiveKotlinFloat = "kotlin.Float"
        private const val primitiveKotlinDouble = "kotlin.Double"
        private const val primitiveKotlinString = "kotlin.String"
        private const val primitiveKotlinBoolean = "kotlin.Boolean"
        private const val primitiveKotlinByteArray = "kotlin.ByteArray"
        private val primitiveKClassMap = mapOf<KClass<*>, String>(
            Byte::class to primitiveKotlinByte,
            Short::class to primitiveKotlinShort,
            Int::class to primitiveKotlinInt,
            Long::class to primitiveKotlinLong,
            Char::class to primitiveKotlinChar,
            Float::class to primitiveKotlinFloat,
            Double::class to primitiveKotlinDouble,
            String::class to primitiveKotlinString,
            Boolean::class to primitiveKotlinBoolean,
            ByteArray::class to primitiveKotlinByteArray
        )
        private val pattern = "Primitive<([^>]+)>\\((.*)\\)$".toRegex()

        /** Returns whether or not the given type is a supported type for [ReferencablePrimitive]. */
        fun isSupportedPrimitive(klass: KClass<*>): Boolean =
            klass == Byte::class ||
                klass == Short::class ||
                klass == Int::class ||
                klass == Long::class ||
                klass == Float::class ||
                klass == Char::class ||
                klass == Double::class ||
                klass == String::class ||
                klass == Boolean::class ||
                klass == ByteArray::class

        /**
         * If the given [ReferenceId] matches the type of `serialized` reference id created by
         * [ReferencablePrimitive], this will return an instance of [ReferencablePrimitive].
         */
        fun unwrap(id: ReferenceId): ReferencablePrimitive<*>? {
            val match = pattern.matchEntire(id) ?: return null
            val className = match.groups[1]?.value ?: return null
            val value = match.groups[2]?.value ?: return null

            return when {
                className == primitiveKotlinByte ||
                className.contains("java.lang.Byte") ->
                    ReferencablePrimitive(Byte::class, value.toByte())
                className == primitiveKotlinShort ||
                className.contains("java.lang.Short") ->
                    ReferencablePrimitive(Short::class, value.toShort())
                className == primitiveKotlinInt ||
                className.contains("java.lang.Int") ->
                    ReferencablePrimitive(Int::class, value.toInt())
                className == primitiveKotlinLong ||
                className.contains("java.lang.Long") ->
                    ReferencablePrimitive(Long::class, value.toLong())
                className == primitiveKotlinChar ||
                className.contains("java.lang.Char") ->
                    ReferencablePrimitive(Char::class, value.single())
                className == primitiveKotlinFloat ||
                className.contains("java.lang.Float") ->
                    ReferencablePrimitive(Float::class, value.toFloat())
                className == primitiveKotlinDouble ||
                className.contains("java.lang.Double") ->
                    ReferencablePrimitive(Double::class, value.toDouble())
                className == primitiveKotlinString ->
                    ReferencablePrimitive(String::class, value)
                className == primitiveKotlinBoolean ||
                className.contains("java.lang.Boolean") ->
                    ReferencablePrimitive(Boolean::class, value.toBoolean())
                className == primitiveKotlinByteArray ->
                    ReferencablePrimitive(ByteArray::class, value.toBase64Bytes(), value)
                else -> null
            }
        }
    }
}

/* Extension functions to make conversion easy. */

/** Makes a [Byte]-based [ReferencablePrimitive] from the receiving [Byte]. */
fun Byte.toReferencable(): ReferencablePrimitive<Byte> =
    ReferencablePrimitive(Byte::class, this)

/** Makes a [Short]-based [ReferencablePrimitive] from the receiving [Short]. */
fun Short.toReferencable(): ReferencablePrimitive<Short> =
    ReferencablePrimitive(Short::class, this)

/** Makes an [Int]-based [ReferencablePrimitive] from the receiving [Int]. */
fun Int.toReferencable(): ReferencablePrimitive<Int> =
    ReferencablePrimitive(Int::class, this)

/** Makes a [Long]-based [ReferencablePrimitive] from the receiving [Long]. */
fun Long.toReferencable(): ReferencablePrimitive<Long> =
    ReferencablePrimitive(Long::class, this)

/** Makes a [Char]-based [ReferencablePrimitive] from the receiving [Char]. */
fun Char.toReferencable(): ReferencablePrimitive<Char> =
    ReferencablePrimitive(Char::class, this)

/** Makes a [Float]-based [ReferencablePrimitive] from the receiving [Float]. */
fun Float.toReferencable(): ReferencablePrimitive<Float> =
    ReferencablePrimitive(Float::class, this)

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
