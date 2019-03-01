/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
'use strict';

import {offerWebRtcSignal} from '../../devtools/shared/web-rtc-signalling.js';
import {AbstractDevtoolsChannel} from '../runtime/debug/abstract-devtools-channel.js';
import {DevtoolsBroker} from '../../devtools/shared/devtools-broker.js';

// configures a firebase instance
import {database} from '../../shells/lib/firebase.js';

export class DevtoolsChannel extends AbstractDevtoolsChannel {
  constructor() {
    super();
    this.remoteExploreKey = new URLSearchParams(window.location.search).get('remote-explore-key');
    if (this.remoteExploreKey) {
      this._connectViaWebRtc(this.remoteExploreKey);
    } else {
      document.addEventListener('arcs-debug-in', e => this._handleMessage(e.detail));
    }
  }

  _connectViaWebRtc(remoteExploreKey) {
    console.log(`Attempting a connection with remote Arcs Explorer.`);

    const connection = new RTCPeerConnection({
      iceServers: [
        {urls: 'stun:stun.l.google.com:19302'},
        {urls: 'stun:stun1.l.google.com:19302'},
        {urls: 'stun:stun2.l.google.com:19302'},
      ]
    });
    const channel = connection.createDataChannel('arcs-explorer');

    channel.onopen = e => {
      console.log('WebRTC channel opened');
    };
    channel.onmessage = ({data}) => {
      if (data === 'init') {
        this.webRtcChannel = channel;
        DevtoolsBroker.markConnected();
        this._sendHeartbeat();
      } else {
        this._handleMessage(JSON.parse(data));
      }
    };
    channel.onclose = e => {
      console.warn('WebRTC channel closed');
      this.webRtcChannel = null;
    };
    connection.onicecandidate = e => {
      // Last invocation has null candidate and
      // indicates all candidates have been generated.
      if (e.candidate) return;
      offerWebRtcSignal(
          database,
          remoteExploreKey,
          btoa(JSON.stringify(connection.localDescription)),
          signal => connection.setRemoteDescription(JSON.parse(atob(signal))).catch(e => console.error(e)));
    };

    connection.createOffer().then(offer => {
      return connection.setLocalDescription(offer);
    }).catch(e => {
      console.error(e);
    });
  }

  _sendHeartbeat() {
    if (!this.webRtcChannel) return;
    this.webRtcChannel.send('heartbeat');
    setTimeout(() => this._sendHeartbeat(), 1000);
  }

  _flush(messages) {
    if (this.remoteExploreKey) {
      if (this.webRtcChannel) {
        this.webRtcChannel.send(JSON.stringify(messages));
      } else {
        console.warn('Connection to DevTools is closed. Message not sent.');
      }
    } else {
      document.dispatchEvent(new CustomEvent('arcs-debug-out', {detail: messages}));
    }
  }
}
