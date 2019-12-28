/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {StoreRegistry, UnifiedStore} from '../storageNG/unified-store.js';

/**
 * A trivial registry implementation for testing purposes. Note that it
 * does exactly nothing for now, though someday we might want to actually
 * store, unregister, and allow inspection.
 */
export class TestStoreRegistry implements StoreRegistry {
    registerStore(store: UnifiedStore, tags: string[]): void {
    }

    unregisterStore(storeId: string, tags: string[]) {
    }
}
