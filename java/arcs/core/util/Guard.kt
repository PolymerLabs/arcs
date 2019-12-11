package arcs.core.util

import kotlin.properties.ReadWriteProperty
import kotlin.reflect.KProperty
import kotlinx.coroutines.sync.Mutex

/**
 * Builds a [Guard] property delegate where all access/mutation to the delegated property must be
 * done within a lock on the provided [mutex].
 *
 * [initialValue] is a function which returns the starting value of the property.
 *
 * Example:
 *
 * ```kotlin
 * class MyClass {
 *     val mutex = Mutex()
 *     var myProtectedString: String by guardWith(mutex) { "Hello world." }
 *
 *     suspend fun succeed() {
 *         val randomNum = Random.nextInt()
 *         mutex.withLock { myProtectedString = "Random: $randomNum" }
 *     }
 *
 *     suspend fun crash() {
 *         val randomNum = Random.nextInt()
 *         myProtectedString = "Random: $randomNum"
 *     }
 * }
 * ```
 */
fun <T> guardWith(mutex: Mutex, initialValue: () -> T) = Guard(mutex, initialValue())

/**
 * Builds a [Guard] property delegate where all access/mutation to the delegated property must be
 * done within a lock on the provided [mutex].
 *
 * [initialValue] is the starting value of the property.
 *
 * Example:
 *
 * ```kotlin
 * class MyClass {
 *     val mutex = Mutex()
 *     var myProtectedString: String by guardWith(mutex, "Hello world.")
 *
 *     suspend fun succeed() {
 *         val randomNum = Random.nextInt()
 *         mutex.withLock { myProtectedString = "Random: $randomNum" }
 *     }
 *
 *     suspend fun crash() {
 *         val randomNum = Random.nextInt()
 *         myProtectedString = "Random: $randomNum"
 *     }
 * }
 * ```
 */
fun <T> guardWith(mutex: Mutex, initialValue: T) = Guard(mutex, initialValue)

/** Provider of the [GuardDelegate] property delegate. */
class Guard<T>(private val mutex: Mutex, private val initialValue: T) {
    operator fun provideDelegate(thisRef: Any, prop: KProperty<*>): ReadWriteProperty<Any, T> =
        GuardDelegate(mutex, initialValue)
}

/**
 * Implementation of a [ReadWriteProperty] delegate which checks that the given [mutex] is locked
 * before allowing access/modification to the [value].
 */
private class GuardDelegate<T>(
    private val mutex: Mutex,
    private var value: T
) : ReadWriteProperty<Any, T> {
    override fun getValue(thisRef: Any, property: KProperty<*>): T {
        check(mutex.isLocked) { "Access to ${property.name} must be done within a mutex lock." }
        return value
    }

    override fun setValue(thisRef: Any, property: KProperty<*>, value: T) {
        check(mutex.isLocked) { "Changes to ${property.name} must be done within a mutex lock." }
        this.value = value
    }
}
