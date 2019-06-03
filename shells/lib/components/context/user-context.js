/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {SyntheticStores} from '../../runtime/synthetic-stores.js';
import {StoreObserver} from './store-observer.js';
import {ArcHandleListener, ArcMetaListener, ProfileListener, ShareListener} from './context-listeners.js';

const ArcMetaContext = listener => new ArcHandleListener(new ArcMetaListener(listener));
const ProfileContext = (context, listener) => new ArcHandleListener(new ProfileListener(context, listener));
const ShareContext = (context, listener)  => new ArcHandleListener(new ShareListener(context, listener));

const ContextObserver = (context, store) => new StoreObserver(store,
  // each handle is some Arc Metadata (including key)
  ArcMetaContext(
    // handles from each referenced Arc contains arbitrary profile data
    ProfileContext(context,
      // consume profile data of type [Friend] to look up Friend Arcs
      ArcMetaContext(
        // handles from each referenced Arc contains arbitrary shared data
        ShareContext(context)
      )
    )
  )
);

export class UserContext {
  constructor(context, storageKey) {
    this.ready = new Promise(resolve => this._resolveReady = resolve);
    this.connect(context, storageKey);
  }
  async connect(context, storageKey) {
    const store = await SyntheticStores.getStore(storageKey, 'user-launcher');
    if (store) {
      this.observer = ContextObserver(context, store);
      // wait for ready connection
      await this.observer.ready;
    } else {
      console.warn('UserContext: no launcher arc, will look again in 5s');
      setTimeout(() => this.connect(context, storageKey), 5000);
    }
    // resolve context ready
    this._resolveReady();
  }
}
