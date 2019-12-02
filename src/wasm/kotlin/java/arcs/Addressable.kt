/*
 * Copyright 2019 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */

package arcs

typealias Address = Int

internal object AddressableMap {
    internal val address2Addressable = mutableMapOf<Address, Any>()
    internal val addressable2Address = mutableMapOf<Any, Address>()
    internal var nextAddress = 1;
}

