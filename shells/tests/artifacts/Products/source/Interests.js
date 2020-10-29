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

<style>
  [interests] hr {
    border: 1px none #eeeeee;
    border-top-style: solid;
  }
</style>

<div interests>
  <x-list items="{{items}}">
    <template>
      <div unsafe-html="{{caption}}"></div>
    </template>
  </x-list>
</div>

  `;

  return class extends UiParticle {
    get template() {
      return template;
    }
    shouldRender({list, person}) {
      if (list && person) {
        // simulate data fetch that only resolves for someone with Interest data
        return (person.name === 'Claire');
      }
      return false;
    }
    render({list}) {
      const items = [];
      list.forEach(item => {
        switch (item.name) {
          case 'Field Hockey Stick':
            items.push({caption: '<br><br>Claire`s Interests<hr><h2>Field Hockey</h2><i>... is hockey played on a field. Players generally require a stick.</i><hr><br><br>'});
            break;
        }
      });
      return {items};
    }
  };

});
