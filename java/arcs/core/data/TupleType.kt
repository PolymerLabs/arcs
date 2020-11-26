package arcs.core.data

import arcs.core.type.Tag
import arcs.core.type.Type

/** [Type] representation of a tuple. */
data class TupleType(val elementTypes: List<Type>) : Type {

  constructor(vararg types: Type) : this(types.toList())

  override val tag = Tag.Tuple

  override fun toStringWithOptions(options: Type.ToStringOptions) =
    "(${elementTypes.joinToString { it.toStringWithOptions(options) }})"
}
