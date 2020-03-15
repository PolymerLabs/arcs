package arcs.core.util

/**
 * A miniature lightweight "Optics" utility for Arcs. Mostly used for modifying immutable graph
 * data structures used by the [Allocator].
 *
 * # Lens
 * A lens is a kind of optic in functional programming that allows immutable data structures to
 * be updated compactly and elegantly. A [Lens] is constructed around a data structure and
 * allows its focus target (e.g. field member of a type) to be fetched, modified, or set.
 *
 * A [Lens] can be created easily by the [lens] function around a reference to a property, followed
 * by a code block to copy-construct a class with the modification.
 *
 * ## Example
 * ```kotlin
 * data class Person(name: String, age: Int)
 * val nameLens = lens(Person::name) { t,f -> t.copy(name = f) }
 *
 * val newPerson = nameLens.set(Person("John", 26), "Tom") // result: Person("Tom", 26)
 * val name = nameLens.get(newPerson)                      // result: "Tom"
 * val bang = nameLens.mod(newPerson) { "$it!" }           // result: "Tom!"
 * ```
 *
 * ## Composition
 * Two or more lens can be composed for deep object graph mutation.
 * ```kotlin
 * data class Manager(name: String, employee: Person)
 *
 * val employeeLens = lens(Manager::employee) { t,f -> t.copy(employee = f) }
 * val employeeName = employeeLens + nameLens
 * val manager = Manager("Sally", person)
 * val newManager = employeeName.set(manager, "Rita") // Manager("Sally", Person("Rita", 26))
 * ```
 *
 * ## Traversals
 * When you have a collection field, you need a lens with multiple focii, which is where
 * [Traversal] comes in. It allows you to mutate each member of a collection field (List or Map)
 * constructing a new collection. In the case of [Map], the map values are traversed, the keys
 * are left intact.
 *
 * ## Example: Modify the age of each child
 * ```kotlin
 * data class Parent(name: String, children: List<Person>)
 * val parent = Parent("Mary", listOf(Person("Jack", 4), Person("Jill", 3)))
 * val childrenLens = lens(Parent::children) { t, f = t.copy(children = f) }
 * val ageLens = lens(Person::age) { t,f -> t.copy(age = f) }
 *
 * val allChildren = childrenLens.traverse()
 * val newParent = allChildren.mod(parent) { it.copy(name = "Baby ${it.name}") }
 * // newParent = Parent("Mary", listOf(Person("Baby Jack", 4), Person("Baby Jill", 3)))
 * ```
 *
 * ## Traversal Composition
 * A [Traversal] can be combined with a [Lens], or a another [Traversal] to reach deep into
 * nested data structures.
 *
 * ```kotlin
 * val allChildrenAges = allChildren + ageLens
 * val newParent = allChildrenAges.mod(parent) { it + 1 }
 * // newParent = Parent("Mary", listOf(Person("Jack", 5), Person("Jill", 4)))
 * ```
 *
 * ## Reference
 * Based on the ideas in
 * [http://davids-code.blogspot.com/2014/02/immutable-domain-and-lenses-in-java-8.html]
 *
 * @property getter a lambda which given [Subject] returns [Focus]
 * @property setter a lambda which given [Subject] and [Focus] returns new [Subject] set with [Focus]
 */
open class Lens<Subject, Focus>(
    private val getter: (Subject) -> Focus,
    private val setter: (Subject, Focus) -> Subject
) {
    /** Invokes a getter on the [Subject] and returns a [Focus] value. */
    fun get(target: Subject): Focus = getter(target)

    /** Invokes a setter on the [Subject] with the given [Focus] value and returns a new [Subject]. */
    fun set(target: Subject, value: Focus): Subject = setter(target, value)

    /**
     * Applies a function to the value of invoking [get] on the [Subject], and then invokes
     * [set] on the [Subject] with the value, returning a new [Subject].
     */
    fun mod(target: Subject, f: (Focus) -> Focus): Subject {
        return set(target, f(get(target)))
    }

    /**
     * Allows two or more [Lens] to be composed and chained so that a deeply nested immutable
     * data structure can be elegantly updated. Returns a new [Lens].
     */
    fun <Parent> comp(parentLens: Lens<Parent, Subject>): Lens<Parent, Focus> =
        object : Lens<Parent, Focus>(
            { parent: Parent -> get(parentLens.get(parent)) },
            { parent: Parent, focus: Focus ->
                parentLens.mod(parent) { target: Subject ->
                    set(target, focus)
                }
            }
        ) {}
}

/**
 * A [Traversal] is sort of a [Lens] with more than one focii. A [Lens] could be considered a
 * [Traversal] with a single focii.
 */
interface Traversal<Subject, Focus> {
    /**
     * Apply [f] to every focii in this traversal and return an updated target.
     */
    fun mod(target: Subject, f: (Focus) -> Focus): Subject
}

/**
 * A [Traversal] over the [List] returned by a [Lens] whose focus type is a `List<Focus>`.
 */
class ListLensTraversal<Subject, Focus>(
    private val listLens: Lens<Subject, List<Focus>>
) : Traversal<Subject, Focus> {
    override fun mod(target: Subject, f: (Focus) -> Focus) = listLens.mod(target) {
        it.map(f)
    }
}

/**
 * A [Traversal] over the values of the [Map] returned by a [Lens] whose focus is the type
 * `Map<String, Focus>`.
 */
class MapLensTraversal<Subject, Focus>(
    private val mapLens: Lens<Subject, Map<String, Focus>>
) : Traversal<Subject, Focus> {
    override fun mod(target: Subject, f: (Focus) -> Focus) = mapLens.mod(target) {
        it.mapValues { (_, v) -> f(v) }
    }
}

/** Pseudo-constructor for creating a [Lens]. */
fun <Subject, Focus> lens(getter: (Subject) -> Focus, setter: (Subject, Focus) -> Subject) =
    Lens(getter, setter)

/** Extension function converts a `Lens<T, List<F>>` into a `Traversal<T, F>`. */
fun <Subject, Focus> Lens<Subject, List<Focus>>.traverse() = ListLensTraversal(this)

/** Extension function converts a `Lens<T, Map<String, F>>` into a `Traversal<T, F>`. */
fun <Subject, Focus> Lens<Subject, Map<String, Focus>>.traverse() = MapLensTraversal(this)

/** Compose two [Lens]s to create a new lens which accesses the nested [Focus]. */
infix fun <Parent, Subject, Focus> Lens<Parent, Subject>.compose(other: Lens<Subject, Focus>) =
    other.comp(this)

/**
 * Compose two [Traversal]s into a new [Traversal] which is the cartesian product of the
 * two sequences they traverse.
 */
infix fun <Parent, Subject, Focus> Traversal<Parent, Subject>.compose(
    other: Traversal<Subject, Focus>
) = object : Traversal<Parent, Focus> {
    override fun mod(target: Parent, f: (Focus) -> Focus) = this@compose.mod(target) {
        other.mod(it, f)
    }
}

/**
 * Compose a [Traversal] and a [Lens] into a [Traversal] that applies the [Lens] for each
 * element in the [Traversal].
 */
infix fun <Parent, Subject, Focus> Traversal<Parent, Subject>.compose(
    lens: Lens<Subject, Focus>
) = object : Traversal<Parent, Focus> {
    override fun mod(target: Parent, f: (Focus) -> Focus) = this@compose.mod(target) {
        lens.mod(it, f)
    }
}

/** Operator overload alias for infix [compose] */
operator fun <Parent, Subject, Focus> Lens<Parent, Subject>.plus(other: Lens<Subject, Focus>) =
    this compose other

/** Operator overload alias for infix [compose] */
operator fun <Parent, Subject, Focus> Traversal<Parent, Subject>.plus(
    other: Traversal<Subject, Focus>
) = this compose other

/** Operator overload alias for infix [compose] */
operator fun <Parent, Subject, Focus> Traversal<Parent, Subject>.plus(lens: Lens<Subject, Focus>) =
    this compose lens
