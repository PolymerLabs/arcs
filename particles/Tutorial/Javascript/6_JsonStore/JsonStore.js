/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
defineParticle(({SimpleParticle, html}) => {
  return class extends SimpleParticle {
    get template() {
      return html`Hello <span>{{name}}</span>, aged <span>{{age}}</span>!`;
    }

    shouldRender({inputData}) {
      return inputData;
    }

    render({inputData}) {
      return {name: inputData.name, age: inputData.age};
    }
  };
});
