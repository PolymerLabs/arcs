/// BareSpecifier=@vaadin\vaadin-split-layout\test\observer-component
import { PolymerElement } from '../../../@polymer/polymer/polymer-element.js';
import { FlattenedNodesObserver } from '../../../@polymer/polymer/lib/utils/flattened-nodes-observer.js';
import { html } from '../../../@polymer/polymer/lib/utils/html-tag.js';
class ObserverComponent extends PolymerElement {
  static get template() {
    return html`
    <style>
      .bluetext {
        color: rgb(0, 0, 255);
      }
    </style>
`;
  }

  static get is() {
    return 'observer-component';
  }

  ready() {
    super.ready();
    this._observer = new FlattenedNodesObserver(this, info => {
      this._blueText = document.createElement('div');
      this._blueText.classList.add('bluetext');
      this._blueText.innerHTML = 'blue';
      this.shadowRoot.appendChild(this._blueText);
    });
  }

  getTextColor() {
    return getComputedStyle(this._blueText).color;
  }
}

customElements.define(ObserverComponent.is, ObserverComponent);