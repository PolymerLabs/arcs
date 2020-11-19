/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import '../../lib/platform/loglevel-web.js';
import {Runtime} from '../../../build/runtime/runtime.js';
import {Const} from '../../configuration/constants.js';
import {SyntheticStores} from '../../lib/synthetic-stores.js';
import {StoreObserver} from '../../lib/store-observer.js';
import {ArcHandleListener, ArcMetaListener, ProfileListener, ShareListener} from '../../lib/context-listeners.js';
import {ProfileDisplayMixin, ShareDisplayMixin, ArcMetaDisplayMixin, ArcHandleDisplayMixin} from './table-mixins.js';
import '../../../modalities/dom/components/arc-tools/store-explorer.js';

const storage = `firebase://arcs-storage.firebaseio.com/AIzaSyBme42moeI-2k8WgXh-6YK_wYyjEXo4Oz8/0_7_0/sjmiles`;

// configure arcs environment
Runtime.init('../../../');

let context;
let UserObserverImpl;

const observe = async () => {
  // prepare context
  if (!context) {
    context = await Runtime.parse('');
    //
    const ArcHandleListenerImpl = ArcHandleDisplayMixin(ArcHandleListener);
    //
    const ArcMetaListenerImpl =
      listener => new ArcHandleListenerImpl(new (ArcMetaDisplayMixin(ArcMetaListener))(listener));
    const ProfileListenerImpl =
      (context, listener) => new ArcHandleListenerImpl(new (ProfileDisplayMixin(ProfileListener))(context, listener));
    const ShareListenerImpl =
      (context, listener)  => new ArcHandleListenerImpl(new (ShareDisplayMixin(ShareListener))(context, listener));
    //
    UserObserverImpl = store => new StoreObserver(store,
      // each handle is some Arc Metadata (including key)
      ArcMetaListenerImpl(
        // handles from each referenced Arc contains arbitrary profile data
        ProfileListenerImpl(context,
          // consume profile data of type [Friend] to look up Friend Arcs
          ArcMetaListenerImpl(
            // handles from each referenced Arc contains arbitrary shared data
            ShareListenerImpl(context)
          )
        )
      )
    );
    //
    document.querySelector('store-explorer').context = context;
  }
  // `user-launcher` store contains keys for user's Arcs
  const store = await SyntheticStores.getStore(storage, Const.DEFAULT.launcherId);
  if (store) {
    return UserObserverImpl(store);
  }
};

// surface api to ui buttons

window.observe = async () => {
  window.ob = await observe();
  window.dispose = () => window.ob.dispose();
};

// start right away

window.observe();
