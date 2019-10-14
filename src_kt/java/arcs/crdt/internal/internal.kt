package arcs.crdt.internal

/** Denotes an individual actor responsible for modifications to a Crdt. */
typealias Actor = String

/** Alias of [HashMap] from [String] to [Int] used to implement a vector clock. */
typealias VersionMap = HashMap<Actor, Int>

/** Represents a referencable object, ie. one which can be referenced by a unique [id]. */
interface Referencable {
  /** Unique identifier of the Referencable object. */
  val id: String
}
