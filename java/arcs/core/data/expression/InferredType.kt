package arcs.core.data.expression

import arcs.core.util.BigInt
import kotlin.reflect.KClass

/**
 * Matches [widenAndApply] in Expression.kt
 *
 * The types are listed in terms of decreasing width, so that a type at position n can always
 * be widened to a type at position n - 1.
 */
private val widenOrder = listOf<InferredType.Primitive>(
  InferredType.Primitive.NumberType,
  InferredType.Primitive.DoubleType,
  InferredType.Primitive.FloatType,
  InferredType.Primitive.BigIntType,
  InferredType.Primitive.LongType,
  InferredType.Primitive.IntType,
  InferredType.Primitive.ShortType,
  InferredType.Primitive.ByteType
)

/** Convert a [KClass] into an appropriate [InferredType] */
fun KClass<*>.toType() = InferredType.Primitive.of(this)

/** Widen a list of types to the largest type that encompasses all of them. */
fun widen(vararg types: InferredType): InferredType.Primitive {
  types.forEach {
    require(it is InferredType.Numeric) {
      "$it is not numeric"
    }
  }

  return widenOrder.firstOrNull {
    types.contains(it)
  } ?: throw IllegalArgumentException("$types contains incompatible types.")
}

/**
 * An [InferredType] is based on following a tree of DSL expressions from the leaves to the root,
 * flowing types upward so that each node can be assigned a conservative bound on the types it
 * may output.
 */
sealed class InferredType {
  open fun isAssignableFrom(other: InferredType): Boolean = this == other
  fun union(other: InferredType) = UnionType(setOf(this, other))

  /** Represents all primitive types such as numbers, text, booleans, etc. */
  sealed class Primitive(val kClass: KClass<*>) : InferredType() {
    override fun isAssignableFrom(other: InferredType): Boolean = when {
      this is Numeric && other is Numeric -> widen(this, other) == this
      else -> this == other
    }

    override fun toString() = "${kClass.simpleName ?: super.toString()}"

    object DoubleType : Primitive(Double::class), Numeric
    object FloatType : Primitive(Float::class), Numeric
    object BigIntType : Primitive(BigInt::class), Numeric
    object LongType : Primitive(Long::class), Numeric
    object IntType : Primitive(Int::class), Numeric
    object ShortType : Primitive(Short::class), Numeric
    object ByteType : Primitive(Byte::class), Numeric
    object NumberType : Primitive(Number::class), Numeric
    object BooleanType : Primitive(Boolean::class)
    object TextType : Primitive(String::class)
    object NullType : Primitive(NullType::class)

    companion object {
      private val kclassToType by lazy {
        listOf(
          DoubleType,
          FloatType,
          BigIntType,
          LongType,
          IntType,
          ShortType,
          ByteType,
          NumberType,
          BooleanType,
          TextType,
          NullType
        ).associateBy({ it.kClass }, { it })
      }

      /** All primitive types. */
      val allTypes by lazy {
        kclassToType.values.toSet()
      }

      /** Given a [KClass] return the corresponding [InferredType]. */
      fun of(kClass: KClass<*>) = requireNotNull(kclassToType[kClass]) {
        "Unable to map $kClass to an InferredType."
      }
    }
  }

  /** Represents union of several possible types. */
  data class UnionType(val types: Set<InferredType>) : InferredType() {
    constructor(vararg types: InferredType) : this(setOf(*types))

    override fun toString() =
      "${types.joinToString(separator = "|")}"

    override fun isAssignableFrom(other: InferredType): Boolean = when (other) {
      is UnionType -> other.types.all { this.isAssignableFrom(it) }
      else -> types.any { it.isAssignableFrom(other) }
    }
  }

  /** Represents a seequence of values of the given type. */
  data class SeqType(val type: InferredType) : InferredType() {
    override fun toString() = "Sequence<$type>"
    override fun isAssignableFrom(other: InferredType): Boolean = when (other) {
      is SeqType -> type.isAssignableFrom(other.type)
      else -> false
    }
  }

  /** Represents a type corresponding to a scope with variables of various types. */
  data class ScopeType(val scope: Expression.Scope) : InferredType() {
    override fun toString() = "$scope"
    override fun isAssignableFrom(other: InferredType): Boolean {
      if (other !is ScopeType) {
        return false
      }
      return scope == other.scope
    }
  }

  /** Tagging interface for all [Primitive] types that are numeric. */
  interface Numeric
}
