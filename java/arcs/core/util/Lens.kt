package arcs.core.util

/**
 * A miniature lightweight "Optics" utility for Arcs. Mostly used to modifying immutable graph
 * data structures used by the [Allocator].
 *
 * A lens is an kind of optic in functional programming that allows immutable data structures to
 * be updated compactly and elegantly. A [Lens] is constructed around a data structure and
 * allows its focus target (e.g. field member of a type) to be fetched, modified, or set.
 *
 * @property getter a lambda which given [Target] returns [Focus]
 * @property setter a lambda which given [Target] and [Focus] returns new [Target] set with [Focus]
 *
 * Based on the ideas in
 * http://davids-code.blogspot.com/2014/02/immutable-domain-and-lenses-in-java-8.html
 */
open class Lens<Target, Focus>(
    private val getter: (Target) -> Focus,
    private val setter: (Target, Focus) -> Target
) {
    /** Invokes a getter on the [Target] and returns a [Focus] value. */
    fun get(target: Target) : Focus = getter(target)

    /** Invokes a setter on the [Target] with the given [Focus] value and returns a new [Target]. */
    fun set(target: Target, value: Focus) : Target = setter(target, value)

    /**
     * Applies a function to the value of invoking [get] on the [Target], and then invokes
     * [set] on the [Target] with the value, returning a new [Target].
     */
    fun mod(target: Target, f: (Focus) -> Focus): Target {
        return set(target, f(get(target)))
    }

    /**
     * Allows two or more [Lens] to be composed and chained so that a deeply nested immutable
     * data structure can be elegantly updated. Returns a new [Lens].
     */
    fun <Parent> comp(parentLens: Lens<Parent, Target>) : Lens<Parent, Focus> =
        object : Lens<Parent, Focus>(
            { parent : Parent -> get(parentLens.get(parent)) },
            { parent : Parent, focus: Focus ->
                parentLens.mod(parent) { target: Target ->
                    set(target, focus)
                }
            }
        ) {}
}

/**
 * A [Traversal] is sort of a [Lens] with more than one focii. A [Lens] could be considered a
 * [Traversal] with a single focii.
 */
interface Traversal<Target, Focus> {
    /**
     * Apply [f] to every focii in this traversal and return an updated target.
     */
    fun mod(target: Target, f: (Focus) -> Focus): Target
}

/**
 * A [Traversal] over the [List] returned by a [Lens] whose focus type is a `List<Focus>`.
 */
class ListLensTraversal<Target, Focus>(
    private val listLens: Lens<Target, List<Focus>>
) : Traversal<Target, Focus> {
    override fun mod(target: Target, f: (Focus) -> Focus) = listLens.mod(target) {
        it.map(f)
    }
}

/**
 * A [Traversal] over the values of the [Map] returned by a [Lens] whose focus is the type
 * `Map<String, Focus>`.
 */
class MapLensTraversal<Target, Focus>(
    private val mapLens: Lens<Target, Map<String, Focus>>
) : Traversal<Target, Focus> {
    override fun mod(target: Target, f: (Focus) -> Focus) = mapLens.mod(target) {
        it.mapValues { (_, v) -> f(v) }
    }
}

/** Pseudo-constructor for creating a [Lens]. */
fun <Target, Focus> lens(getter: (Target) -> Focus, setter: (Target, Focus) -> Target) =
    Lens(getter, setter)

/** Extension function converts a `Lens<T, List<F>>` into a `Traversal<T, F>`. */
fun <Target, Focus> Lens<Target, List<Focus>>.traverse() = ListLensTraversal(this)

/** Extension function converts a `Lens<T, Map<String, F>>` into a `Traversal<T, F>`. */
fun <Target, Focus> Lens<Target, Map<String, Focus>>.traverse() = MapLensTraversal(this)

/** Compose two [Lens]s to create a new lens which accesses the nested [Focus]. */
infix fun <Parent, Target, Focus> Lens<Parent, Target>.compose(other: Lens<Target, Focus>) =
    other.comp(this)


/**
 * Compose two [Traversal]s into a new [Traversal] which is the cartesian product of the
 * two sequences they traverse.
 */
infix fun <Parent, Target, Focus> Traversal<Parent, Target>.compose(
    other: Traversal<Target, Focus>
) = object : Traversal<Parent, Focus> {
    override fun mod(target: Parent, f: (Focus) -> Focus) = this@compose.mod(target) {
        other.mod(it, f)
    }
}

/**
 * Compose a [Traversal] and a [Lens] into a [Traversal] that applies the [Lens] for each
 * element in the [Traversal].
 */
infix fun <Parent, Target, Focus> Traversal<Parent, Target>.compose(
    lens: Lens<Target, Focus>
) = object : Traversal<Parent, Focus> {
    override fun mod(target: Parent, f: (Focus) -> Focus) = this@compose.mod(target) {
        lens.mod(it, f)
    }
}

operator fun <Parent, Target, Focus> Lens<Parent, Target>.plus(other: Lens<Target, Focus>) =
    this compose other

operator fun <Parent, Target, Focus> Traversal<Parent, Target>.plus(
    other: Traversal<Target, Focus>
) = this compose other

operator fun <Parent, Target, Focus> Traversal<Parent, Target>.plus(lens: Lens<Target, Focus>) =
    this compose lens
