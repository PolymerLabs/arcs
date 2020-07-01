package arcs.core.util

import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Dispatchers

/**
 * Centralized dispatcher references for use across Arcs to allow
 * Arcs users to customize with their own dispatchers as needed.
 */
object Dispatchers {

    @JvmStatic
    var Default: CoroutineDispatcher = Dispatchers.Default

    @JvmStatic
    var IO: CoroutineDispatcher = Dispatchers.IO

    @JvmStatic
    var Unconfined: CoroutineDispatcher = Dispatchers.Unconfined
}
