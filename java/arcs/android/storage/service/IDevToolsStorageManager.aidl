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

package arcs.android.storage.service;

import arcs.android.storage.service.IDevToolsProxy;

/**
 * Exposed API to manage storage for DevTools
 */
interface IDevToolsStorageManager {

    /**
     * Return the storage keys for active stores in csv format. Placeholder function to demonstrate
     * storage -> devtoolsService -> client cycle.
     */
    String getStorageKeys();

    IDevToolsProxy getDevToolsProxy();

}
