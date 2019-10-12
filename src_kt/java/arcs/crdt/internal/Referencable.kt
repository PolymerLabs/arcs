package arcs.crdt.internal

/** Represents a referencable object, ie. one which can be referenced by a unique [id]. */
interface Referencable {
  /** Unique identifier of the Referencable object. */
  val id: String
}
