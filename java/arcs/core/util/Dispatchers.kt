package arcs.core.util

import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Dispatchers

object Dispatchers {

    @JvmStatic
    var Default: CoroutineDispatcher = Dispatchers.Default

    @JvmStatic
    var IO: CoroutineDispatcher = Dispatchers.IO

    @JvmStatic
    var Unconfined: CoroutineDispatcher = Dispatchers.Unconfined
}
