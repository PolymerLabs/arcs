package arcs.core.analysis

/** An abstract domain representing a set of values, where the elements are ordered by inclusion. */
data class AbstractSet<S>(
    val value: BoundedAbstractElement<Set<S>>
) : AbstractValue<AbstractSet<S>> {
    override val isBottom = value.isBottom
    override val isTop = value.isTop

    /** Returns the underling set. Returns null if this is `Top` or `Bottom`. */
    val set: Set<S>?
        get() = value.value

    constructor(s: Set<S>) : this(BoundedAbstractElement.makeValue(s))

    override infix fun isEquivalentTo(other: AbstractSet<S>) =
        value.isEquivalentTo(other.value) { a, b -> a == b }

    override infix fun join(other: AbstractSet<S>) = AbstractSet(
        value.join(other.value) { a, b -> a union b }
    )

    override infix fun meet(other: AbstractSet<S>) = AbstractSet(
        value.meet(other.value) { a, b -> a intersect b }
    )

    override fun toString() = when {
        value.isTop -> "TOP"
        value.isBottom -> "BOTTOM"
        else -> "$set"
    }

    companion object {
        fun <S> getBottom() = AbstractSet<S>(BoundedAbstractElement.getBottom<Set<S>>())
        fun <S> getTop() = AbstractSet<S>(BoundedAbstractElement.getTop<Set<S>>())
    }
}
