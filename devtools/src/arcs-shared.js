const $_documentContainer = document.createElement('template');
$_documentContainer.setAttribute('style', 'display: none;');

$_documentContainer.innerHTML = `<dom-module id="shared-styles">
  <template>
    <style>
      :host {
        --paper-item-min-height: 24px;
        --paper-font-subhead_-_font-size: 12px;

        --light-gray: #f3f3f3;
        --mid-gray: #ccc;
        --dark-gray: #888;
        --highlight-blue: #3879d9;
        --dark-red: #b71c1c;
        --dark-green: #09ba12;
      }
      .devtools-icon {
        display: inline-block;
        width: 28px;
        height: 24px;
        -webkit-mask-image: -webkit-image-set(
            url(../img/devtools_icons_1x.png) 1x,
            url(../img/devtools_icons_2x.png) 2x);
        background-color: rgb(110, 110, 110);
      }
      .devtools-icon-color {
        display: inline-block;
        background-image: -webkit-image-set(
            url(../img/devtools_icons_color_1x.png) 1x,
            url(../img/devtools_icons_color_2x.png) 2x);
        width: 10px;
        height: 10px;
      }
      .nav-list {
        margin: 10px 0;
        display: block;
      }
      .nav-list a {
        display: block;
        padding: 0 16px;
        text-decoration: none;
        line-height: 20px;
        color: rgb(90, 90, 90);
        font-size: 12px;
      }
      [nav-narrow] .nav-list a {
        padding: 0 6px;
      }
      [nav-narrow] .nav-list a label {
        display: none;
      }
      .nav-list a.iron-selected {
        color: #fff;
        background-color: var(--highlight-blue);
      }
      .nav-list a iron-icon {
        margin-right: 3px;
      }
      vaadin-split-layout {
        height: 100%;
      }
      vaadin-split-layout > aside {
        background-color: var(--light-gray);
        overflow: scroll;
      }
      vaadin-split-layout > aside > * {
        margin: 5px 5px 5px 2px;
      }
    </style>
  </template>
</dom-module>`;

document.head.appendChild($_documentContainer.content);
const writeOps = ['set', 'store', 'clear', 'remove'];

export function formatTime(timestamp, digits = 0) {
  let d = new Date(timestamp);
  let time = [d.getHours(), d.getMinutes(), d.getSeconds()].map(x => String(x).padStart(2, '0')).join(':');
  if (digits > 0) time += (timestamp / 1000 % 1).toFixed(digits).substr(1);
  return time;
}

export function indentPrint(thing) {
  if (typeof thing === 'string') thing = JSON.parse(thing);
  return JSON.stringify(thing, null, 2);
}

/* @polymerMixin */
const MessageSenderMixin = subclass => class extends subclass {
  send(message) {
    this.dispatchEvent(new CustomEvent('message', {detail: message}));
  }
};

export {MessageSenderMixin, writeOps};
