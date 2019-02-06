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

import {AbstractDevtoolsChannel} from '../runtime/debug/abstract-devtools-channel.js';
import {DevtoolsBroker} from '../../devtools/shared/devtools-broker.js';
import {assert} from './assert-web.js';

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
    console.log(`Attempting a connection with remote Arcs Explorer on "${remoteExploreKey}".`);

    const [showConnectionSuccess, showConnectionLost] = this._createVisualMarkerForRemoteDebugging();
    const p = new SimplePeer({initiator: true, trickle: false, objectMode: true});

    p.on('signal', (data) => {
      const encoded = btoa(JSON.stringify(data));
      const hub = signalhub('arcs-demo', 'https://arcs-debug-switch.herokuapp.com/');

      let receivedAnswer = false;

      hub.subscribe(`${remoteExploreKey}:answer`).on('data', (message) => {
        if (message === 'waiting') {
          console.log('Received:', message);
          setTimeout(() => {
            if (!receivedAnswer) {
              // Re-broadcast if we connected first and our offer was lost.
              console.log(`Re-broadcasting my signal on ${remoteExploreKey}:offer:`, data);
              hub.broadcast(`${remoteExploreKey}:offer`, encoded);
            }
          }, 500);
        } else {
          receivedAnswer = true;
          const receivedSignal = JSON.parse(atob(message));
          console.log(`Received on ${remoteExploreKey}:answer:`, receivedSignal);
          p.signal(receivedSignal);
          hub.close();
        }
      });

      console.log(`Broadcasting my signal on ${remoteExploreKey}:offer:`, data);
      hub.broadcast(`${remoteExploreKey}:offer`, encoded);
    });

    p.on('error', (err) => {
      console.error('WebRTC error. Disconnecting.', err);
      this.webRtcPeer = null;
      showConnectionLost();
    });
    p.on('connect', () => console.log('WebRTC channel established!'));
    p.on('data', (msg) => {
      if (msg === 'init') {
        this.webRtcPeer = p;
        DevtoolsBroker.markConnected();
        showConnectionSuccess();
        this._sendHeartbeat();
      } else {
        this._handleMessage(JSON.parse(msg));
      }
    });
  }

  _sendHeartbeat() {
    if (!this.webRtcPeer) return;
    this.webRtcPeer.send('heartbeat');
    setTimeout(() => this._sendHeartbeat(), 1000);
  }

  _createVisualMarkerForRemoteDebugging() {
    // TODO: Discuss with Scott moving these bits to WebShell if we want this.
    const notification = document.createElement('div');
    notification.innerText = 'Connecting to Remote Explorer...';
    notification.style.cssText = 'background-color: darkorange; font-size: 12px; font-weight: bold; color: white; text-align: center; position: fixed; left: 0; top: 0; right: 0; box-shadow: 0 0 4px rgba(0,0,0,.5); z-index: 1;';

    const body = document.querySelector('body');
    body.style.paddingTop = '16px';
    body.appendChild(notification);

    return [() => {
      notification.innerText = 'Remote Explorer Connected';
      notification.style.background = 'Red';
    }, () => {
      notification.innerText = 'Remote Explorer Disconnected';
      notification.style.background = 'Black';
    }];
  }

  _flush(messages) {
    if (this.remoteExploreKey) {
      if (this.webRtcPeer) {
        this.webRtcPeer.send(JSON.stringify(messages));
      } else {
        console.warn('Connection to DevTools is closed. Message not sent.');
      }
    } else {
      document.dispatchEvent(new CustomEvent('arcs-debug-out', {detail: messages}));
    }
  }
}
