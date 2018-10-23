import {PolymerElement} from '../deps/@polymer/polymer/polymer-element.js';

class ArcsCommunicationChannel extends PolymerElement {
  static get is() { return 'arcs-communication-channel'; }

  ready() {
    document.addEventListener('send-message', ({detail}) => {
      if (this._preInitMsgQueue) {
        this._preInitMsgQueue.push(detail);
      } else {
        this._fire(detail);
      }
    });
    // We perform below after the event loop tick to let other polymer elements
    // to go through ready() handlers before we let the events in.
    setTimeout(() => {
      if (window._msgRaceConditionGuard) {
        // devtools.js loaded first (most likely in standalone mode),
        // we'll let it know we're ready to receive.
        document.dispatchEvent(new Event('arcs-communication-channel-ready'));
      } else {
        // We loaded first (most likely in extension mode),
        // let's wait for devtools.js.
        window._msgRaceConditionGuard = 'devtools-webapp-loaded';
        this._preInitMsgQueue = [];
        document.addEventListener('arcs-communication-channel-ready', e => {
          for (const msg of this._preInitMsgQueue) {
            this._fire(msg);
          }
          this._preInitMsgQueue = undefined;
        });
      }
    }, 0);
  }

  _fire(msg) {
    document.dispatchEvent(new CustomEvent('command', {detail: msg}));
  }
}
window.customElements.define(ArcsCommunicationChannel.is, ArcsCommunicationChannel);
