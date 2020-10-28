/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

defineParticle(({UiParticle}) => {
  return class SingleSlotParticle extends UiParticle {
    get template() {
      return `<div><{{value}}/div>`;
    }
    shouldRender(props) {
      return props && props.foo;
    }
    render(props, state) {
      const {foo} = props;
      return {
        value: (foo && foo.value) || 'n/a'
      };
    }
  };
});
