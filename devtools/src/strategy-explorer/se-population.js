/*
Copyright (c) 2017 Google Inc. All rights reserved.
This code may only be used under the BSD style license found at
http://polymer.github.io/LICENSE.txt
Code distributed by Google as part of this project is also
subject to an additional IP rights grant found at
http://polymer.github.io/PATENTS.txt
*/

import '../../deps/@polymer/polymer/polymer-legacy.js';
import './se-recipe.js';
import './se-shared.js';
import {Polymer} from '../../deps/@polymer/polymer/lib/legacy/polymer-fn.js';
import {html} from '../../deps/@polymer/polymer/lib/utils/html-tag.js';

Polymer({
  _template: html`
    <style include="se-shared-styles">
    :host {
      display: block;
      margin: 2px;
    }

    .strategy-container {
      display: flex;
    }

    .recipe-container {
      display: flex;
      flex-wrap: wrap;
    }

    .strategy-box {
      border: 1px solid #bbb;
      padding: 2px;
      margin-right: 2px;
    }
    </style>
    <div class="strategy-container">
      <template is="dom-repeat" items="{{population}}">
        <div class="strategy-box" diff\$="[[item._diff]]">
          {{camelCaseToRegularForm(item.strategy)}}
          <div class="recipe-container">
            <template is="dom-repeat" items="{{item.recipes}}">
              <se-recipe recipe="{{item}}">
              </se-recipe>
            </template>
          </div>
        </div>
      </template>
    </div>
`,

  is: 'se-population',

  // Allows line breaking.
  camelCaseToRegularForm(strategyName) {
    return strategyName.replace(/([A-Z])/g, ' $1');
  }
});
