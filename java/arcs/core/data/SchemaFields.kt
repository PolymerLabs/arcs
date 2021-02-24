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

package arcs.core.data

import arcs.core.type.Type
import arcs.flags.BuildFlags
import arcs.flags.BuildFlagDisabledError

/** The possible types for a field in a [Schema]. */
sealed class FieldType(
  val tag: Tag,
  open val annotations: List<Annotation> = emptyList()
) {
  /** An Arcs primitive type. */
  data class Primitive(val primitiveType: PrimitiveType) : FieldType(Tag.Primitive) {
    override fun toString() = primitiveType.name
  }

  /** A reference to an entity. */
  data class EntityRef(
    val schemaHash: String,
    override val annotations: List<Annotation> = emptyList()
  ) : FieldType(Tag.EntityRef, annotations) {
    override fun toString() = "&$schemaHash${annotations.joinToString() { " @${it.name}" }}"
    val isHardReference = annotations.any { it.name == "hardRef" }
  }

  /** A tuple of [FieldType]s */
  data class Tuple(val types: List<FieldType>) : FieldType(Tag.Tuple) {
    constructor(vararg types: FieldType) : this(types.toList())

    override fun toString() = "(${types.joinToString()})"
  }

  data class ListOf(val primitiveType: FieldType) : FieldType(Tag.List)

  data class NullableOf(val innerType: FieldType) : FieldType(Tag.Nullable) {
    init {
      if (!BuildFlags.NULLABLE_VALUE_SUPPORT) {
        throw BuildFlagDisabledError("NULLABLE_VALUE_SUPPORT")
      }
    }
  }

  data class InlineEntity(val schemaHash: String) : FieldType(Tag.InlineEntity)

  enum class Tag {
    Primitive,
    EntityRef,
    Tuple,
    List,
    InlineEntity,
    Nullable
  }

  /**
   * A helper method that returns a nullable of the type if NULLABLE_VALUE_SUPPORT is enabled,
   * but otherwise returns the type 'as-is'.
   * This is useful for writing code using nullables that is flag independant.
   * TODO(b/181084704): Clean up this code when removing NULLABLE_VALUE_SUPPORT flag.
   */
  fun nullable(): FieldType = if (!BuildFlags.NULLABLE_VALUE_SUPPORT) {
    this
  } else {
    NullableOf(this)
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
    val BigInt = Primitive(PrimitiveType.BigInt)
    val Duration = Primitive(PrimitiveType.Duration)
    val Instant = Primitive(PrimitiveType.Instant)
  }
}

/**
 * Arcs primitive types.
 *
 * Modifying this enum will require a DB migration.
 * - It is safe to append additional entries, up to the limit of
 *   [DatabaseImpl.REFERENCE_TYPE_SENTINEL]. However, the new types will need to be inserted into
 *   active databases, as primitive types are only added in onCreate.
 * - Modifying DatabaseImpl.REFERENCE_TYPE_SENTINEL is significantly more fraught, and migration
 *   would putatively require finding all impacted references (i.e. references with typeId less
 *   than the new REFERENCE_TYPE_SENTINEL) and rewriting them.
 * - Do not change the established mapping from PrimitiveType to id.
 * - When adding new entries, ensure each PrimitiveType gets assigned a unique id, and that the
 *   unique ids are tightly packed in the range 0..size - 1. Note that this requirement is guarded
 *   by a test in [SchemaFieldsTest].
 */
enum class PrimitiveType(val id: kotlin.Int) {
  Boolean(0),
  Number(1),
  Text(2),
  Byte(3),
  Short(4),
  Int(5),
  Long(6),
  Char(7),
  Float(8),
  Double(9),
  BigInt(10),
  Instant(11),
  Duration(12);

  fun primitiveTypeId() = id.toLong()
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

  companion object {
    val EMPTY = SchemaFields(singletons = emptyMap(), collections = emptyMap())
  }
}
