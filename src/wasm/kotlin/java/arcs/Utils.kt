package arcs

import arcs.Address
import arcs.Addressable
import arcs.RuntimeClient

fun log(msg: String) = RuntimeClient.log(msg)
fun abort() = RuntimeClient.abort()
fun assert(message: String, cond: Boolean) = RuntimeClient.assert(message, cond)


