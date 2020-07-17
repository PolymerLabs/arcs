package arcs.core.data

import arcs.core.common.LiteralList
import arcs.core.type.Tag
import arcs.core.type.Type
import arcs.core.type.TypeFactory
import arcs.core.type.TypeLiteral

/** [Type] representation of a tuple. */
data class TupleType(val elementTypes: List<Type>) : Type {

    constructor(vararg types: Type) : this(types.toList())

    override val tag = Tag.Tuple

    override fun copy(variableMap: MutableMap<Any, Any>): Type =
        TypeFactory.getType(Literal(tag, LiteralList(elementTypes.map { it.toLiteral() })))

    override fun copyWithResolutions(variableMap: MutableMap<Any, Any>): Type =
        TupleType(elementTypes.map { it.copyWithResolutions(variableMap) })

    override fun toLiteral() = Literal(tag, LiteralList(elementTypes.map { it.toLiteral() }))

    override fun toString(options: Type.ToStringOptions) =
        "(${elementTypes.joinToString { it.toString(options) }})"

    /** [Literal] representation of a [TupleType]. */
    data class Literal(
        override val tag: Tag,
        override val data: LiteralList<TypeLiteral>
    ) : TypeLiteral

    companion object {
        init {
            TypeFactory.registerBuilder(Tag.Tuple) { literal ->
                TupleType((literal as Literal).data.map { TypeFactory.getType(it) })
            }
        }

        /**
         * Utility function for constructing [TupleType] from the passed types.
         *
         * @param types the list of types from which to construct the tuple.
         */
        fun of(vararg types: Type) = TupleType(types.toList())
    }
}
