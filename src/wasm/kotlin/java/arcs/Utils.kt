package arcs

/**
 * Utilities for ease-of-use
 *
 * Sugar to delegate function calls to methods on the current [RuntimeClient].
 */

fun log(msg: String) = RuntimeClient.log(msg)
fun abort() = RuntimeClient.abort()
fun assert(message: String, cond: Boolean) = RuntimeClient.assert(message, cond)


