/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

'use strict';

defineParticle(({UiParticle, html}) => {

  const template = html`
<div gift-list>
  <style>
    [gift-list] {
      padding: 4px 0;
      border-bottom: 2px solid #eeeeee;
    }
    [gift-list] input {
      color: #666666;
      font-size: 1.1em;
      font-family: inherit;
      border: none;
    }
  </style>
  for <span>{{person}}</span>'s <span title="{{occasionDate}}">{{occasion}}</span> • <input type="date" value="{{date}}">
</div>
  `;

  return class extends UiParticle {
    get template() {
      return template;
    }
    shouldRender({person}) { return Boolean(person); }
    render({person}) {
      const name = (person && person.name) || 'n/a';
      const occasion = (person && person.occasion) || 'n/a';
      const inOneWeek =
        new Date(new Date().setHours(21*24)) // Advance time by three weeks
          .toISOString().substr(0, 10);
      return {
        person: name,
        occasion,
        occasionDate: inOneWeek,
        date: inOneWeek
      };
    }
  };
});
