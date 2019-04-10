import '../../lib/firebase-support.js';
import '../../lib/loglevel-web.js';
import {SyntheticStores} from '../../lib/synthetic-stores.js';
import {StoreObserver} from './store-observer.js';
import {ArcHandleListener, ArcMetaListener, ProfileListener, ShareListener} from './listeners.js';
import {ProfileDisplayMixin, ShareDisplayMixin, ArcMetaDisplayMixin, ArcHandleDisplayMixin} from './table-mixins.js';
import {Utils} from '../../lib/utils.js';

const storage = `firebase://arcs-storage.firebaseio.com/AIzaSyBme42moeI-2k8WgXh-6YK_wYyjEXo4Oz8/0_7_0/sjmiles`;

// configure arcs environment
const paths = {
  root: '../../..'
};
Utils.init(paths.root, paths.map);

let context;
let UserObserverImpl;

const observe = async () => {
  // prepare context
  if (!context) {
    context = await Utils.parse('');
    //
    const ArcHandleListenerImpl = ArcHandleDisplayMixin(ArcHandleListener);
    //
    const ArcMetaListenerImpl =
      listener => new ArcHandleListenerImpl(new (ArcMetaDisplayMixin(ArcMetaListener))(listener));
    const ProfileListenerImpl =
    (context, listener) => new ArcHandleListenerImpl(new (ProfileDisplayMixin(ShareDisplayMixin(ProfileListener)))(context, listener));
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
  }
  //
  const store = await SyntheticStores.getStore(storage, 'user-launcher');
  if (store) {
    // `user-launcher` store tracks user's Arcs
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
