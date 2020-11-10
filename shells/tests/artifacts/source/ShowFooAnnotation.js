/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

defineParticle(({UiParticle}) => {
  return class ShowFooAnnotation extends UiParticle {
    get template() {
      return `
        <div><span>Here: </span><span>{{annotation}}</span></div>
      `;
    }
    shouldRender(props) {
      return props && props.foo;
    }
    render({foo}, state) {
      return {
        annotation: `this is annotation for ${(foo && foo.bar) || 'n/a'}`
      };
    }
  };
});
