package arcs.crdt

/** Exception describing an issue which has occurred while working with CRDT data. */
class CrdtException(message: String, cause: Throwable? = null) : Exception(message, cause)
