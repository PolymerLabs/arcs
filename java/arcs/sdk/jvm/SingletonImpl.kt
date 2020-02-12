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

package arcs.sdk

/** [ReadWriteSingleton] implementation for the JVM. */
@Suppress("UNUSED_PARAMETER")
// TODO: Connect to storage.
class SingletonImpl<T : Entity>(
    private val particle: Particle,
    override val name: String,
    entitySpec: EntitySpec<T>
) : ReadWriteSingleton<T> {
    private var entity: T? = null
    private val onUpdateActions: MutableList<(T?) -> Unit> = mutableListOf()

    override suspend fun fetch(): T? = entity

    override suspend fun store(entity: T) {
        this.entity = entity
        particle.onHandleUpdate(this)
        onUpdateActions.forEach { action ->
            action(entity)
        }
    }

    override suspend fun clear() {
        this.entity = null
        particle.onHandleUpdate(this)
        onUpdateActions.forEach { action ->
            action(entity)
        }
    }

    override fun onUpdate(action: (T?) -> Unit) {
        onUpdateActions.add(action)
    }
}
