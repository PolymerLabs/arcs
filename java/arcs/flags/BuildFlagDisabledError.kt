package arcs.flags

/** Exception thrown when a required build flag is not enabled. */
class BuildFlagDisabledError(flag: String) : Exception("Required build flag $flag is disabled")
