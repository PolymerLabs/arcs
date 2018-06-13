/*
Copyright (c) 2017 Google Inc. All rights reserved.
This code may only be used under the BSD style license found at
http://polymer.github.io/LICENSE.txt
Code distributed by Google as part of this project is also
subject to an additional IP rights grant found at
http://polymer.github.io/PATENTS.txt
*/

import '../../deps/@polymer/polymer/polymer-legacy.js';
import '../arcs-shared.js';
import {Polymer} from '../../deps/@polymer/polymer/lib/legacy/polymer-fn.js';
import {html} from '../../deps/@polymer/polymer/lib/utils/html-tag.js';

Polymer({
  _template: html`
    <style include="shared-styles">
      :host {
        display: block;
      }
      .arc-box {
        background: white;
        border: 1px solid var(--mid-gray);
        white-space: pre;
        font-family: consolas, 'Source Code Pro', monospace;
        font-size: 10px;
        padding: 5px;
      }
      .title {
        font-weight: bold;
      }
    </style>
    <div class="arc-box">
      <div hidden\$="[[isArcStringEmpty(arcString)]]">
        <div class="title">Active Arc:</div>
        <div>{{arcString}}</div>
        <hr>
      </div>

      <div hidden\$="[[isContextStringEmpty(contextString)]]">
        <div class="title">Arc context:</div>
        <div>{{contextString}}</div>
      </div>
    </div>
`,

  is: 'se-arc-view',

  properties: {
    arc: Object,
    arcString: String,
    contextString: String,
  },

  attached: function() {
    document.addEventListener('set-arc', e => {
      this.arc = e.detail;
      this.arcString = this.arc.toContextString();
      this.contextString = this.arc.context.toString();
    });
  },

  isArcStringEmpty(arcString) {
    return !arcString || arcString.length == 0;
  },

  isContextStringEmpty(contextString) {
    return !contextString || contextString.length == 0;
  }
});
