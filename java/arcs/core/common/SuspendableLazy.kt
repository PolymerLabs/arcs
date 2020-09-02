package arcs.core.common

import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/**
 * A coroutine-safe wrapper to manage init of a property that has a [suspend] initializer. This is
 * a convenience for defining properties on an object that have to be initialized via a suspend
 * function, when you want to avoid the containing class requiring initialization in a suspend
 * function as well.
 *
 * Example:
 *
 * Given a method like:
 *```
 *   suspend fun createAThing(): TheThing
 *```
 * You can create a property in a class using:
 *
 * ```
 * class UsesTheThing {
 *   private val thing: SuspendableLazy<TheThing> { createAThing() }
 *
 *
 *   fun useTheThing() {
 *     println("Here's the thing: ${thing()}")
 *   }
 * }
 * ```
 */
class SuspendableLazy<T>(
    private val create: suspend () -> T
) {
    // Protects access to the item
    private val mutex = Mutex()

    // This will only be null until the first time the object is invoked.
    private var item: T? = null

    /**
     * When invoked for the first time, the [create] method provided at construction will be
     * executed, and the result will be saved internally, and returned from this method call.
     *
     * Subsequent calls to the method will return the same value.
     */
    suspend operator fun invoke(): T = mutex.withLock {
        return item ?: create().also {
            item = it
        }
    }
}
