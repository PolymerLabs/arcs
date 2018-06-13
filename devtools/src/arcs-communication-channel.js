import {PolymerElement} from '../deps/@polymer/polymer/polymer-element.js';

class ArcsCommunicationChannel extends PolymerElement {
  static get is() { return 'arcs-communication-channel'; }

  constructor() {
    super();
    this._preInitMsgQueue = [];
  }

  ready() {
    document.addEventListener('arcs-communication-channel-ready', e => {
      if (this._preInitMsgQueue) {
        for (let msg of this._preInitMsgQueue) {
          this._fire(msg);
        }
        this._preInitMsgQueue = undefined;
      }
    });
    document.addEventListener('messages', e => {
      this.dispatchEvent(new CustomEvent('messages', {detail: e.detail}));
    });
  }

  send(messageType, messageBody, targetArcId = null) {
    let msg = {messageType, messageBody, targetArcId};
    if (this._preInitMsgQueue) {
      this._preInitMsgQueue.push(msg);
    } else {
      this._fire(msg);
    }
  }

  _fire(msg) {
    document.dispatchEvent(new CustomEvent('command', {detail: msg}));
  }
}
window.customElements.define(ArcsCommunicationChannel.is, ArcsCommunicationChannel);
