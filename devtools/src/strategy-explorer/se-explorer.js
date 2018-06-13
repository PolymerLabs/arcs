/*
Copyright (c) 2017 Google Inc. All rights reserved.
This code may only be used under the BSD style license found at
http://polymer.github.io/LICENSE.txt
Code distributed by Google as part of this project is also
subject to an additional IP rights grant found at
http://polymer.github.io/PATENTS.txt
*/

import '../../deps/@polymer/polymer/polymer-legacy.js';
import './se-population.js';
import {Polymer} from '../../deps/@polymer/polymer/lib/legacy/polymer-fn.js';
import {html} from '../../deps/@polymer/polymer/lib/utils/html-tag.js';

Polymer({
  _template: html`
    <style>
      :host {
        overflow-y: scroll;
      }
    </style>
    <div>
      <template is="dom-repeat" items="{{results}}">
        <se-population population="{{item.population}}"></se-population>
      </template>
    </div>
`,

  is: 'se-explorer'
});
