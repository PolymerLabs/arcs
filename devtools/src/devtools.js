/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

// This file initializes debug mode on the arc and contains message receiving
// and queing, so that opening DevTools without showing the Arcs panel is
// sufficient to start gathering information.
import {listenForWebRtcSignal} from '../shared/web-rtc-signalling.js';

(() => {
  const msgQueue = [];
  let windowForEvents = undefined;

  const sendMessage = (function chooseConnection() {
    const params = new URLSearchParams(window.location.search);
    if (params.has('remote-explore-key')) {
      return connectViaWebRtc(params.get('remote-explore-key'));
    } else if (chrome.devtools && chrome.devtools.inspectedWindow.tabId) {
      // Use the extension API if we're in devtools and having a window to inspect.
      return connectViaExtensionApi();
    } else {
      // Otherwise use WebSocket. We may still be in devtools, but inspecting Node.js.
      // In such case, there's no window to inspect.
      return connectViaWebSocket(params.get('explore-proxy') || window.webSocketPort);
    }
  })();

  if (chrome && chrome.devtools) {
    // Add the panel for devtools, and flush the events to it once it's shown.
    chrome.devtools.panels.create('Arcs',
      null,
      'index.html',
      panel => panel.onShown.addListener(panelWindow => initializeWindow(panelWindow)));
  } else {
    // Fire on a regular window without queueing in the standalone scenario.
    initializeWindow(window);
  }

  function initializeWindow(w) {
    if (windowForEvents) return;
    w.document.addEventListener('command', e => sendMessage(e.detail));

    const setWindowForEventsAndEmptyMsgQueue = () => {
      windowForEvents = w;
      for (const msg of msgQueue) fire(msg);
      msgQueue.length = 0;
    };

    if (w._msgRaceConditionGuard) {
      // arcs-communication-channel.js loaded first (likely in extension mode),
      // let's let it know we are ready to receive events.
      w.document.dispatchEvent(new Event('arcs-communication-channel-ready'));
      setWindowForEventsAndEmptyMsgQueue();
    } else {
      w._msgRaceConditionGuard = 'devtools-script-loaded';
      // We loaded first (likely in standalone mode),
      // let's wait for arcs-communication-channel.js before sending it stuff.
      w.document.addEventListener('arcs-communication-channel-ready', e => {
        setWindowForEventsAndEmptyMsgQueue();
      });
    }
  }

  function connectViaExtensionApi() {
    const backgroundPageConnection = chrome.runtime.connect({name: 'arcs'});
    backgroundPageConnection.postMessage({
        name: 'init',
        tabId: chrome.devtools.inspectedWindow.tabId
    });
    backgroundPageConnection.onMessage.addListener(
      e => queueOrFire(e));
    return msg => {
      backgroundPageConnection.postMessage({
          name: 'command',
          tabId: chrome.devtools.inspectedWindow.tabId,
          msg
      });
    };
  }

  function connectViaWebSocket(port) {
    const ws = new WebSocket(`ws://localhost:${port}`);
    ws.onopen = _ => {
      console.log(`WebSocket connection established.`);
      ws.onmessage = receiveMessage;
      ws.send('init');
    };
    ws.onerror = _ => {
      queueOrFire([{
        messageType: 'connection-status-broken',
        messageBody: `Unable to connect to port ${port}. Is your server running?`,
      }]);
      console.log(`No WebSocket connection found.`);
    };

    return msg => ws.send(JSON.stringify(msg));
  }

  function connectViaWebRtc(remoteExploreKey) {
    console.log(`Attempting a connection with Remote WebShell.`);

    const connection = new RTCPeerConnection();
    queueOrFire([{messageType: 'connection-status-waiting'}]);
    listenForWebRtcSignal(
      firebase.initializeApp({databaseURL: 'https://arcs-storage.firebaseio.com'}).database(),
      remoteExploreKey,
      offer => connection.setRemoteDescription(JSON.parse(atob(offer)))
        .then(() => connection.createAnswer())
        .then(async answer => {
          await connection.setLocalDescription(answer);
          return btoa(JSON.stringify(answer));
        }));

    let channel = null;
    connection.ondatachannel = event => {
      channel = event.channel;
      channel.onmessage = receiveMessage;
      channel.onopen = _ => {
        console.log('WebRTC channel opened.');
        channel.send('init');
        queueOrFire([{messageType: 'connection-status-connected'}]);
      };
      channel.onclose = _ => {
        console.log('WebRTC channel closed');
        channel = null;
      };
    };

    return msg => {
      if (!channel) {
        console.warn('Channel not available', msg);
      } else {
        channel.send(JSON.stringify(msg));
      }
    };
  }

  function receiveMessage({data}) {
    let m = null;
    try {
      m = JSON.parse(data);
    } catch (e) {
      // Can happen with WebRTC due to message slicing.
      // We need to solve this properly by avoiding sending messages above certain size limit.
      console.error('Issues with parsing messages:', e);
      return;
    }
    queueOrFire(m);
  }

  function queueOrFire(msg) {
    if (windowForEvents) {
      fire(msg);
    } else {
      msgQueue.push(msg);
    }
  }

  function fire(msg) {
    windowForEvents.document.dispatchEvent(new CustomEvent('raw-messages', {detail: msg}));
  }
})();
