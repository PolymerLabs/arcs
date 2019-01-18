import {PolymerElement} from '../deps/@polymer/polymer/polymer-element.js';
import {MessengerMixin} from './arcs-shared.js';
import {html} from '../deps/@polymer/polymer/lib/utils/html-tag.js';

class ArcsNotifications extends MessengerMixin(PolymerElement) {
  static get template() {
    return html`
    <style include="shared-styles">
      :host {
        display: inline-block;
      }
      #warningsSection {
        display: inline-block;
        position: relative;
        background: #fffae0;
        padding: 5px;
        border-radius: 15px;
      }
      .warning-icon {
        vertical-align: unset;
        background-position: -60px 10px;
        margin-right: 4px;
      }
      #warningsDetails {
        position: absolute;
        left: 0;
        top: 20px;
        line-height: initial;
        width: 300px;
        border: 1px solid var(--mid-gray);
        background: #fffae0;
        z-index: 1;
        border-radius: 8px;
        box-shadow: 2px 2px 2px rgba(0,0,0,.2);
      }
      #warningsDetails > div {
        padding: 8px 10px;
      }
      #warningsDetails > div:not(:last-child) {
        border-bottom: 1px solid var(--mid-gray);
      }
    </style>
    <span id="warningsSection">
      <span class="devtools-icon-color warning-icon"></span><!-- avoid whitespace
   --><span id="warningsCount"></span>
      <div id="warningsDetails" style="display: none"></div>
    </span>
`;
  }

  static get is() { return 'arcs-notifications'; }

  static get properties() {
    return {
      warningsCount: {
        type: Number,
        value: 0,
        observer: '_updateWarningCount'
      },
      visible: {
        reflectToAttribute: true,
        computed: '_visible(warningsCount)'
      }
    };
  }

  ready() {
    super.ready();
    window.addEventListener('click', e => {
      if (this.$.warningsDetails.style.display == 'none'
          && e.path.includes(this.$.warningsSection)) {
        this.$.warningsDetails.style.display = 'block';
      } else if (this.$.warningsDetails.style.display == 'block'
          && !e.path.includes(this.$.warningsDetails)) {
        this.$.warningsDetails.style.display = 'none';
      }
    });
  }

  onMessageBundle(messages) {
    for (const msg of messages) {
      switch (msg.messageType) {
        case 'warning':
          this._addWarning(msg.messageBody);
          break;
        case 'page-refresh':
          this._clear();
          break;
      }
    }
  }

  _visible(warningsCount) {
    return warningsCount > 0;
  }

  _addWarning(type) {
    if (this.$.warningsDetails.querySelector(`[warningType=${type}]`)) return;

    const el = document.createElement('div');
    el.setAttribute('warningType', type);

    if (type === 'pre-existing-arc') {
      el.innerHTML = `Arcs Explorer has been opened after arc creation,
          some <b>information may be missing</b>. Reload the page
          to ensure all information is available.`;
    } else if (type === 'reconnected') {
      el.innerHTML = `Arcs Explorer has been closed and reopened,
          some <b>information may be missing</b>. Reload the page
          to ensure all information is available.`;
    } else {
      console.warn(`Warning type not recognized: ${type}`);
      return;
    }

    this.$.warningsDetails.appendChild(el);
    this.warningsCount++;
  }

  _clear() {
    this.warningsCount = 0;
    this.$.warningsDetails.innerHTML = '';
    this.$.warningsDetails.style.display = 'none';
  }

  _updateWarningCount(warningsCount) {
    this.$.warningsCount.innerText = warningsCount;
    this.$.warningsSection.style.display = warningsCount ? null : 'none';
  }
}

window.customElements.define(ArcsNotifications.is, ArcsNotifications);
