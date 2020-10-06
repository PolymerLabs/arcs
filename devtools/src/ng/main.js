/**
 * @license
 * Copyright 2020 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {PolymerElement} from '../../deps/@polymer/polymer/polymer-element.js';
import {html} from '../../deps/@polymer/polymer/lib/utils/html-tag.js';
import '../../deps/golden-layout/src/css/goldenlayout-base.css.js';
import '../../deps/golden-layout/src/css/goldenlayout-light-theme.css.js';
import '../arcs-shared.js';
import './overview.js';
import './raw-log.js';
import '../../deps/@polymer/iron-icons/iron-icons.js';
import '../../deps/@polymer/iron-icons/editor-icons.js';
import '../../deps/@polymer/iron-icons/maps-icons.js';
import '../../deps/@polymer/iron-icons/image-icons.js';
import '../../deps/@polymer/iron-icons/av-icons.js';

class Main extends PolymerElement {
  static get template() {
    return html`
    <style include="shared-styles goldenlayout-base.css goldenlayout-light-theme.css">
      #main {
        position: relative;
        height: 100vh;
      }
      /* TODO: Create our own golden-layout theme instead of overriding. */
      .lm_content {
        background: white;
        position: relative;
        overflow: auto;
      }
      .lm_header .lm_tab {
        /* Fixing uneven padding caused by missing close button.
           This can be reverted once we allow closing and re-opening tools. */
        padding: 0 10px 4px;
      }
    </style>
    <div id="main"></div>
`;
  }

  static get is() { return 'devtools-main'; }

  ready() {
    super.ready();

    const tools = {
      'Raw Log': 'devtools-raw-log',
      'Overview': 'devtools-overview',
    };

    // TODO: Save user's layout to local storage and restore from it.
    const layout = new GoldenLayout({
      content: [{
        type: 'row',
        content: Object.entries(tools).map(([name]) => ({
          type: 'component',
          componentName: name,
          // TODO: Allow closing and then re-opening tools.
          isClosable: false
        }))
      }],
      settings: {
        // Pulling a tool into a popup resets its state,
        // which we cannot recover.
        showPopoutIcon: false,
      },
    }, this.$.main);

    for (const [name, elementName] of Object.entries(tools)) {
      layout.registerComponent(name, function(container) {
        const element = document.createElement(elementName);
        container.getElement().append(element);
        container.on('show', () => element.setAttribute('active', ''));
        container.on('hide', () => element.removeAttribute('active'));
      });
    }

    layout.init();

    // We need to observe the body for changes as opposed to #main, because when the viewport
    // shrinks #main will not shrink if it is filled with content, body however will.
    new ResizeObserver(rects => {
      const {width, height} = rects[0].contentRect;
      layout.updateSize(width, height);
    }).observe(document.body);

    // We perform below after the event loop tick to let other polymer elements
    // to go through ready() handlers before we let the events in.
    setTimeout(() => {
      document.dispatchEvent(new Event('arcs-communication-channel-ready'));
    }, 0);
  }
}

window.customElements.define(Main.is, Main);
