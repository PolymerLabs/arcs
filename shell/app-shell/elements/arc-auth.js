/**
 * @license
 * Copyright (c) 2016 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

// TODO(wkorman): Note the FireBase auth library is loaded earlier in
// apps/web/index.html and see comment there for more.

import Xen from '../../components/xen/xen.js';
const firebase = window.firebase;

class ArcAuth extends Xen.Base {
  get host() {
    return this;
  }
  _didMount() {
    firebase.auth().onAuthStateChanged(user => {
      if (user) {
        ArcAuth.log(`user is [${user.displayName}]`);
        // User is signed in.
        const displayName = user.displayName;
        const email = user.email;
        const emailVerified = user.emailVerified;
        const photoURL = user.photoURL;
        const isAnonymous = user.isAnonymous;
        const uid = user.uid;
        const providerData = user.providerData;
        this._credential(user);
      } else {
        let provider = new firebase.auth.GoogleAuthProvider();
        // firebase.auth().signInWithPopup(provider).then(this._credential.bind(this));
        firebase.auth().signInWithRedirect(provider);
        /*
        firebase.auth().getRedirectResult().then(result => {
          if (result.user === null) {
            firebase.auth().signInWithRedirect(provider);
          } else {
            this._credential(result);
          }
        });
        */
      }
    });
  }
  _credential(user) {
    ArcAuth.log('credentials: ', user);
    this._fire('auth', user);
  }
}
ArcAuth.log = Xen.logFactory('ArcAuth', '#00701a');
customElements.define('arc-auth', ArcAuth);

export default ArcAuth;
