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

package arcs.core.data

import arcs.core.type.Type

/** The possible types for a field in a [Schema]. */
sealed class FieldType(
    val tag: Tag
) {
    /** An Arcs primitive type. */
    data class Primitive(val primitiveType: PrimitiveType) : FieldType(Tag.Primitive) {
        override fun toString() = primitiveType.name
    }

    /** A reference to an entity. */
    data class EntityRef(val schemaHash: String) : FieldType(Tag.EntityRef) {
        override fun toString() = "&$schemaHash"
    }

    /** A tuple of [FieldType]s */
    data class Tuple(val types: List<FieldType>) : FieldType(Tag.Tuple) {
        override fun toString() = "(${types.joinToString()})"
    }

    data class ListOf(val primitiveType: PrimitiveType) : FieldType(Tag.List)

    enum class Tag {
        Primitive,
        EntityRef,
        Tuple,
        List
    }

    // Convenient aliases for all of the primitive field types.
    companion object {
        val Boolean = Primitive(PrimitiveType.Boolean)
        val Number = Primitive(PrimitiveType.Number)
        val Text = Primitive(PrimitiveType.Text)
        val Byte = Primitive(PrimitiveType.Byte)
        val Short = Primitive(PrimitiveType.Short)
        val Int = Primitive(PrimitiveType.Int)
        val Long = Primitive(PrimitiveType.Long)
        val Char = Primitive(PrimitiveType.Char)
        val Float = Primitive(PrimitiveType.Float)
        val Double = Primitive(PrimitiveType.Double)
    }
}

/** Arcs primitive types. */
enum class PrimitiveType {
    Boolean,
    Number,
    Text,
    Byte,
    Short,
    Int,
    Long,
    Char,
    Float,
    Double
}

val LARGEST_PRIMITIVE_TYPE_ID = PrimitiveType.values().size - 1

/** TODO: This is super minimal for now. */
data class SchemaFields(
    val singletons: Map<FieldName, FieldType>,
    val collections: Map<FieldName, FieldType>
) {

    override fun toString() = toString(Type.ToStringOptions())

    fun toString(options: Type.ToStringOptions): String {
        val fields = when (options.hideFields) {
            true -> "..."
            false -> listOf(
                singletons.map { (name, type) -> "$name: $type" },
                collections.map { (name, type) -> "$name: [$type]" }
            ).flatten().joinToString()
        }
        return "{$fields}"
    }
}
