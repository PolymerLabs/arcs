/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

'use strict';

defineParticle(({UiParticle, html}) => {

  return class MakeCake extends UiParticle {
    get template() {
      return html`
      <div>
        <span hidden="{{notSpecial}}" style="font-weight:bold">{{occasion}}</span> <span>{{name}}</span> cake
        <div hidden="{{notSpecial}}"><div slotid="special"></div></div>
      </div>
    `;
    }
    shouldRender(props) {
      return Boolean(props.cake);
    }

    render({cake}) {
      return {
        name: cake.name,
        notSpecial: !cake.occasion,
        occasion: cake.occasion
      };
    }
  };
});
