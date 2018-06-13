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
import './se-shared.js';
import {Polymer} from '../../deps/@polymer/polymer/lib/legacy/polymer-fn.js';
import {html} from '../../deps/@polymer/polymer/lib/utils/html-tag.js';

Polymer({
  _template: html`
    <style include="shared-styles se-shared-styles">
      :host {
        display: block;
      }
      .legend {
        background: white;
        border: 1px solid var(--mid-gray);
        padding-top: 5px;
        overflow: hidden;
      }
      .column {
        display: inline-block;
        min-width: max-content;
        width: 45%;
      }
      .column > div {
        margin: 0 5px 5px;
        line-height: 25px;
      }
      #recipe-box {
        width:25px;
        height: 25px;
        display: inline-block;
        vertical-align: middle;
        margin-right: 3px;
      }
    </style>
    <div class="legend">
      <div class="column">
        <div><div id="recipe-box" resolved=""></div> Not Valid</div>
        <div><div id="recipe-box" valid=""></div> Not Resolved</div>
        <div><div id="recipe-box" valid="" resolved="" combined=""></div> Combined</div>
        <div><div id="recipe-box" valid="" resolved="" active=""></div> Active</div>
        <div><div id="recipe-box" valid="" resolved="" terminal=""></div> Terminal</div>
        <div><div id="recipe-box" valid="" resolved="" irrelevant=""></div> Irrelevant</div>
      </div>
      <div class="column">
        <div><div id="recipe-box" valid="" resolved="" selected=""></div> Selected</div>
        <div><div id="recipe-box" valid="" resolved="" selectedancestor=""></div> Selected Ancestor</div>
        <div><div id="recipe-box" valid="" resolved="" selectedparent=""></div> Selected Parent</div>
        <div><div id="recipe-box" valid="" resolved="" selecteddescendant=""></div> Selected Descendant</div>
        <div><div id="recipe-box" valid="" resolved="" selectedchild=""></div> Selected Child</div>
      </div>
    </div>
`,

  is: 'se-legend'
});
