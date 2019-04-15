import {SyntheticStores} from '../../synthetic-stores.js';
import {StoreObserver} from './store-observer.js';
import {ArcHandleListener, ArcMetaListener, ProfileListener, ShareListener} from './context-listeners.js';
import '../../../../modalities/dom/components/arc-tools/store-explorer.js';

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
      // resolve context ready
      this._resolveReady();
    }
  }
}
