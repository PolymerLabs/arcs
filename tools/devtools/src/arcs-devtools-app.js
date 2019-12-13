/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {PolymerElement} from '../deps/@polymer/polymer/polymer-element.js';
import {MessengerMixin} from './arcs-shared.js';
import {html} from '../deps/@polymer/polymer/lib/utils/html-tag.js';
import '../deps/golden-layout/src/css/goldenlayout-base.css.js';
import '../deps/golden-layout/src/css/goldenlayout-light-theme.css.js';

import './arcs-overview.js';
import './arcs-stores.js';
import './arcs-planning.js';
import './arcs-communication-channel.js';
import './arcs-environment.js';
import './arcs-notifications.js';
import './arcs-tracing.js';
import './arcs-pec-log.js';
import './arcs-hcr-list.js';
import './arcs-selector.js';
import './strategy-explorer/strategy-explorer.js';
import './arcs-recipe-editor.js';
import './arcs-connection-status.js';

class ArcsDevtoolsApp extends MessengerMixin(PolymerElement) {
  static get template() {
    return html`
    <style include="shared-styles goldenlayout-base.css goldenlayout-light-theme.css">
      :host {
        height: 100vh;
        display: flex;
        flex-direction: column;
      }
      header {
        height: 27px;
        flex-grow: 0;
      }
      arcs-notifications:not([visible])  + [divider] {
        display: none;
      }
      #main {
        position: relative;
        flex-grow: 1;
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
    <arcs-communication-channel></arcs-communication-channel>
    <arcs-connection-status></arcs-connection-status>
    <header id="header" class="header">
      <div section>
        <arcs-notifications></arcs-notifications><div divider></div>
        <arcs-selector active-page="[[routeData.page]]"></arcs-selector>
      </div>
    </header>
    <div id="main"></div>
`;
  }

  static get is() { return 'arcs-devtools-app'; }

  ready() {
    super.ready();

    const tools = {
      'Overview': 'arcs-overview',
      'Environment': 'arcs-environment',
      'Storage': 'arcs-stores',
      'Execution Log': 'arcs-pec-log',
      'Strategizer': 'strategy-explorer',
      'Planner': 'arcs-planning',
      'Tracing': 'arcs-tracing',
      'Editor': 'arcs-recipe-editor',
      'HCR': 'arcs-hcr-list'
    };

    // TODO: Save user's layout to local storage and restore from it.
    const layout = new GoldenLayout({
      content: [{
        type: 'stack',
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
      const {height, width} = rects[0].contentRect;
      layout.updateSize(width, height - this.$.header.offsetHeight);
    }).observe(document.body);
  }
}

window.customElements.define(ArcsDevtoolsApp.is, ArcsDevtoolsApp);
