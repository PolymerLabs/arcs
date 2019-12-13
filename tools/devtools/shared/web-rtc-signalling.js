/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

// A protocol for WebRTC signalling between the Shell and Arcs Explorer using Firebase Database.
// It is more involved than simply storing the signalling information, so that:
//  * We don't connect using stale information sitting in the database.
//  * Order in which parties connect does not matter.
//  * Only one Arcs Explorer and one Shell receives the signalling info from one another.

// To be used by the Arcs Shell.
export function offerWebRtcSignal(database, channelId, shellSignal, onExplorerSignal) {
  const ref = database.ref(`devtoolsSignalling/${channelId}`);
  const initId = randomInt();
  ref.set({init: initId});
  onValue(ref, `ack_${initId}`, ackId => {
    ref.child(`offer_${ackId}`).set(shellSignal);
    onValue(ref, `answer_${ackId}`, explorerSignal => onExplorerSignal(explorerSignal));
  });
}

// To be used by Arcs Explorer.
export function listenForWebRtcSignal(database, channelId, onShellSignal) {
  const ref = database.ref(`devtoolsSignalling/${channelId}`);
  const initRef = ref.child('init');
  const initCb = initIdSnap => {
    if (!initIdSnap.exists()) return;
    const ackId = randomInt();
    ref.child(`ack_${initIdSnap.val()}`).set(ackId);
    onValue(ref, `offer_${ackId}`, shellSignal => {
      initRef.off('value', initCb);
      onShellSignal(shellSignal).then(explorerSignal => {
        ref.child(`answer_${ackId}`).set(explorerSignal);
      });
    });
  };
  initRef.on('value', initCb);
}

// Fire a callback once, but wait if data doesn't exist yet.
function onValue(ref, path, onVal) {
  const childRef = ref.child(path);
  const cb = snap => {
    if (!snap.exists()) return;
    onVal(snap.val());
    childRef.off('value', cb);
  };
  childRef.on('value', cb);
}

function randomInt() {
  return Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
}
