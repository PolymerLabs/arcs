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

package arcs.core.storage

import arcs.core.common.Referencable
import arcs.core.crdt.CrdtSingleton

/** These typealiases are defined to clean up the class declaration below. */
private typealias SingletonProxy<T> =
    StorageProxy<CrdtSingleton.Data<T>, CrdtSingleton.IOperation<T>, T?>
private typealias SingletonHandle<T> =
    Handle<CrdtSingleton.Data<T>, CrdtSingleton.IOperation<T>, T?>

/**
 * Singleton [Handle] implementation for the JVM.
 *
 * It provides methods that can generate the appropriate operations to send to a
 * backing [StorageProxy].
 */
class SingletonImpl<T : Referencable>(
    name: String,
    storageProxy: SingletonProxy<T>
) : SingletonHandle<T> (name, storageProxy) {
    /** Get the current value from the backing [StorageProxy]. */
    fun get() = value

    /** Send a new value to the backing [StorageProxy]. */
    fun set(entity: T) {
        versionMap.increment()
        storageProxy.applyOp(CrdtSingleton.Operation.Update(name, versionMap, entity))
        notifyListeners()
    }

    /** Clear the value from the backing [StorageProxy]. */
    fun clear() {
        storageProxy.applyOp(CrdtSingleton.Operation.Clear(name, versionMap))
        notifyListeners()
    }
}
