/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
const version = '0_7_0';
const firebase = `firebase://arcs-storage.firebaseio.com/AIzaSyBme42moeI-2k8WgXh-6YK_wYyjEXo4Oz8/${version}`;
const pouchdb = `pouchdb://local/arcs/${version}`;
const volatile = 'volatile://';
const prefix = `arcs-${version}`;

export const Const = {
  version,
  DEFAULT: {
    userId: 'user',
    firebaseStorageKey: firebase,
    pouchdbStorageKey: pouchdb,
    volatileStorageKey: volatile,
    storageKey: volatile, //pouchdb, //firebase,
    plannerStorageKey: 'volatile://planificator/a@b',
    manifest: `https://$particles/canonical.arcs`,
    launcherId: 'arc-launcher'
  },
  LOCALSTORAGE: {
    user: `${prefix}-user`,
    storage: `${prefix}-storage`,
    plannerStorage: `${prefix}-plannerStorage`,
    userHistory: `${prefix}-userHistory`
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
