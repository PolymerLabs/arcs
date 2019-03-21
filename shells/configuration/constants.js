const version = '0_6_0';
const volatile = 'volatile';
const firebase = `firebase://arcs-storage.firebaseio.com/AIzaSyBme42moeI-2k8WgXh-6YK_wYyjEXo4Oz8/${version}`;
const pouchdb = `pouchdb://local/arcs`;

export const Const = {
  version,
  defaultUserId: 'user',
  defaultFirebaseStorageKey: firebase,
  defaultPouchdbStorageKey: pouchdb,
  defaultStorageKey: pouchdb, //firebase,
  defaultPlannerStorageKey: volatile,
  defaultManifest: `https://$particles/canonical.manifest`,
  launcherSuffix: `-launcher`,
  LOCALSTORAGE: {
    user: `${version}-user`,
    storage: `${version}-storage`,
    plannerStorage: `${version}-plannerStorage`
  },
  SHARE: {
    private: 1,
    self: 2,
    friends: 3
  },
  STORES: {
    boxed: 'BOXED',
    my: 'PROFILE',
    shared: 'FRIEND'
  }
};
