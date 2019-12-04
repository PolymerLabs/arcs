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
import {AbstractDevtoolsChannel} from '../devtools-connector/abstract-devtools-channel.js';
import {DevtoolsBroker} from '../../devtools/shared/devtools-broker.js';

// configures a firebase instance
import {database} from '../../shells/lib/firebase.js';

export class DevtoolsChannel extends AbstractDevtoolsChannel {
  constructor() {
    super();
    const params = new URLSearchParams(window.location.search);
    if (params.has('explore-proxy')) {
      this.remoteExplore = true;
      this._connectViaWebSocket(params.get('explore-proxy'));
    } else if (params.has('remote-explore-key')) {
      this.remoteExplore = true;
      this._connectViaWebRtc(params.get('remote-explore-key'));
    } else {
      document.addEventListener('arcs-debug-in', e => this._handleMessage(e.detail));
    }
  }

  _connectViaWebRtc(remoteExploreKey) {
    if (!database) {
      throw new Error('Firebase not available, but required to exchange WebRTC signalling.');
    }

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
    channel.onmessage = msg => this._onChannelMessage(msg, channel);
    channel.onclose = e => {
      console.warn('WebRTC channel closed');
      this.channel = null;
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

  _connectViaWebSocket(proxyPort) {
    const ws = new WebSocket(`ws://localhost:${proxyPort || window.location.port || '8786'}`);
    ws.onopen = _ => {
      console.log(`WebSocket channel opened, waiting for Arcs Explorer...`);
      ws.onmessage = msg => this._onChannelMessage(msg, ws);
    };
    ws.onerror = _ => {
      console.log(`No WebSocket connection found.`);
    };
    ws.onclose = _ => {
      console.warn('WebSocket channel closed');
      this.channel = null;
    };
  }

  _onChannelMessage({data}, channel) {
    if (data === 'init') {
      this.channel = channel;
      console.log('Arcs Explorer connected.');
      DevtoolsBroker.markConnected();
      this._sendHeartbeat();
    } else {
      this._handleMessage(JSON.parse(data));
    }
  }

  _sendHeartbeat() {
    if (!this.channel) return;
    this.send({messageType: 'connection-status-heartbeat'});
    setTimeout(() => this._sendHeartbeat(), 1000);
  }

  _flush(messages) {
    if (this.remoteExplore) {
      if (this.channel) {
        this.channel.send(JSON.stringify(messages));
      } else {
        console.warn('Connection to DevTools is closed. Message not sent.');
      }
    } else {
      document.dispatchEvent(new CustomEvent('arcs-debug-out', {detail: messages}));
    }
  }
}
