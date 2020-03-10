/*
 * Copyright 2020 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */
package arcs.core.util

import kotlin.properties.ReadWriteProperty
import kotlin.reflect.KProperty
import kotlinx.coroutines.sync.Mutex

/**
 * Builds a [Guard] property delegate where all access/mutation to the delegated property must be
 * done within a lock on the provided [mutex].
 *
 * [initialValue] is a function which returns the starting value of the property, it will be
 * lazily-called when the property is first accessed (assuming it was not set as the first action on
 * the property).
 *
 * Example:
 *
 * ```kotlin
 * class MyClass {
 *     val mutex = Mutex()
 *     var myProtectedString: String by guardedBy(mutex) { "Hello world." }
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
fun <T> guardedBy(mutex: Mutex, initialValue: () -> T) = Guard(mutex, initialValue)

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
 *     var myProtectedString: String by guardedBy(mutex, "Hello world.")
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
fun <T> guardedBy(mutex: Mutex, initialValue: T) = Guard(mutex) { initialValue }

/** Provider of the [GuardDelegate] property delegate. */
class Guard<T>(private val mutex: Mutex, private val initialValue: () -> T) {
    operator fun provideDelegate(thisRef: Any, prop: KProperty<*>): ReadWriteProperty<Any, T> =
        GuardDelegate(mutex, initialValue)
}

/**
 * Implementation of a [ReadWriteProperty] delegate which checks that the given [mutex] is locked
 * before allowing access/modification to the [value].
 */
private class GuardDelegate<T>(
    private val mutex: Mutex,
    private val initialValue: () -> T
) : ReadWriteProperty<Any, T> {
    private var valueHolder: ValueHolder<T>? = null

    override fun getValue(thisRef: Any, property: KProperty<*>): T {
        check(mutex.isLocked) { "Access to ${property.name} must be done within a mutex lock." }
        val valueHolder = this.valueHolder
        return if (valueHolder == null) {
            initialValue().also { this.valueHolder = ValueHolder(it) }
        } else valueHolder.value
    }

    override fun setValue(thisRef: Any, property: KProperty<*>, value: T) {
        check(mutex.isLocked) { "Changes to ${property.name} must be done within a mutex lock." }
        this.valueHolder?.let { it.value = value } ?: { this.valueHolder = ValueHolder(value) }()
    }

    private class ValueHolder<T : Any?>(var value: T)
}
