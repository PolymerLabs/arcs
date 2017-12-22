/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

"use strict";

defineParticle(({DomParticle}) => {
  let template = `
    <div hidden="{{notAlsoOn}}">
      <span>Also on:</span> <span>{{choices.description}}</span>
    </div>
    `.trim();

  return class extends DomParticle {
    get template() {
      return template;
    }
    _shouldRender(props) {
      return !!props && !!props.product && !!props.choices;
    }
    _render(props) {
      let {product} = props;
      let notAlsoOn = !Boolean(props.choices.find(c => c.name === product.name));
      return {
        notAlsoOn,
      };
    }
  };
});
