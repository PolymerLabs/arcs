/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
defineParticle(({DomParticle, html}) => {   
  return class extends DomParticle {
    get template() {
      return html`Hello <span>{{name}}</span>, aged <span>{{age}}</span>!`;
    }

    // Return true if the input data is valid and we should render to the template. The "props" object contains all of the inputs to the
    // particle. In this case, there's only one input, called "inputData".
    shouldRender(props) {
      // Here we check that props is not null/undefined, and that it contains the expected inputData. This is what the render function below
      // needs.
      return props && props.inputData;
    }

    // The render function is called with the same "props" argument as shouldRender, but here we destructure it into {inputData} to access the
    // field directly.
    render({inputData}) {
      // Binds the "name" and the "age" fields from our particle's input. (We could just return inputData here, but I wanted to show that the
      // placeholder names in the template don't have to match the names of the fields in our entity).
      return {name: inputData.name, age: inputData.age};
    }
  };
});
