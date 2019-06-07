/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Const} from '../../../configuration/constants.js';
import {SyntheticStores} from '../../runtime/synthetic-stores.js';
import {StoreObserver} from './store-observer.js';
import {ArcHandleListener, ArcMetaListener, FriendArcMetaListener, ProfileListener, ShareListener} from './context-listeners.js';

const ArcMetaContext = (context, listener) => new ArcHandleListener(new ArcMetaListener(context, listener));
const ShareContext = (context, listener)  => new ArcHandleListener(new ShareListener(context, listener));
const ProfileContext = (context, listener) => new ArcHandleListener(new ProfileListener(context, listener));
const FriendArcMetaContext = (context, listener) => new ArcHandleListener(new FriendArcMetaListener(context, listener));

const ContextObserver = (context, store) => new StoreObserver(store,
  // each handle is some Arc Metadata (including key)
  ArcMetaContext(context,
    // handles from each referenced Arc contains arbitrary profile data
    ProfileContext(context,
      // consume profile data of type [Friend] to look up Friend Arcs
      FriendArcMetaContext(context,
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
    const store = await SyntheticStores.getStore(storageKey, Const.DEFAULT.launcherId);
    if (store) {
      this.observer = ContextObserver(context, store);
      // wait for ready connection
      await this.observer.ready;
      // wait for StoreObserver to become (heuristically) idle
      await StoreObserver.idle;
      console.warn('UserContext considered ready');
    } else {
      console.warn('UserContext: no launcher arc, will look again in 5s');
      setTimeout(() => this.connect(context, storageKey), 5000);
      // we are about the resolve the context on the next line, even tho
      // we have no context ... this is for the `new user` case, where
      // the user has no context data anyway
    }
    // resolve context ready
    this._resolveReady();
  }
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
