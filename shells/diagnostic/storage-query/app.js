import {ArcHandleListener, ArcMetaListener, ProfileListener, ShareListener} from './listeners.js';
import {ProfileDisplayMixin, ShareDisplayMixin, ArcMetaDisplayMixin, ArcHandleDisplayMixin} from './table-mixins.js';

const ArcHandleListenerImpl = ArcHandleDisplayMixin(ArcHandleListener);

const ArcMetaListenerImpl = listener => new ArcHandleListenerImpl(new (ArcMetaDisplayMixin(ArcMetaListener))(listener));
const ProfileListenerImpl = listener => new ArcHandleListenerImpl(new (ProfileDisplayMixin(ProfileListener))(listener));
const ShareListenerImpl = listener => new ArcHandleListenerImpl(new (ShareDisplayMixin(ShareListener))(listener));

const observe = async () => {
  const store = await SyntheticStores.getStore(storage, 'user-launcher');
  if (store) {
    // `user-launcher` store tracks user's Arcs
    window.ob = new StoreObserver(store,
      // each handle is some Arc Metadata (including key)
      ArcMetaListenerImpl(
        // handles from each referenced Arc contains arbitrary profile data
        ProfileListenerImpl(
          // consume profile data of type [Friend] to look up Friend Arcs
          ArcMetaListenerImpl(
            // handles from each referenced Arc contains arbitrary shared data
            ShareListenerImpl()
          )
        )
      )
    );
    window.dispose = () => window.ob.dispose();
  }
};
window.observe = observe;
observe();
