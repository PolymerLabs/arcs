// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

// Defines the Greet particle in-line. Every DOM particle
// needs to call the defineParticle function to register itself.
defineParticle(({DomParticle, html}) => {

  // Specifies the DOM template to be used when the rendering function
  // is called on the Greet particle. The template syntax is similar
  // to the one used by web component templates.
  const template = html`
    <style>
      [hello] {
        font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
        font-size: 16px;
        background-color: #AED581;
        padding: 20px;
      }
    </style>
    <div hello>
      <!-- Basic variable substitution where {{message}} will be replaced
           by the value associated with 'message' when the particle is
           rendered. Note that the span is necessary here because (for now)
           variable substitution only works if the variable is the only
           child of an element. -->
      <span>{{message}}</span>!
      <!-- Defines where and how the 'customgreeting' slot should be rendered
           in the Greet particle DOM. Any other particle can render content
           into that slot. In the case of our demo, the PersonalGreet
           particle is rendering something into that slot. -->
      <div slotid="customgreeting"></div>
    </div>
  `;

  // Defines the Greet particle as a sub-class of DomParticle.
  // Greet may be speculatively instantiated by Arcs and will
  // (definitely) be instantiated when the user picks the greeting
  // suggestion.
  return class extends DomParticle {
    constructor() { super(); }

    get template() {
      return template;
    }

    willReceiveProps(props) {
        console.log('will receive');
        console.log(props);
      // Copies the greeting message from the input view (i.e., particle input
      // parameter) to the particle's internal state.
      if (props.greeting && props.greeting.message) {
        this.setState({message: props.greeting.message});
      }
    }
    // Main rendering function called whenever the state of the particle changes.
    // Returns the dictionary that is used to do variable substitution in the
    // template above. In our case it specifies a single variable with the
    // greeting. If nothing is returned the particle will not occupy any slot
    // and will not be rendered at all.
    render(props, state) {
      if (state.message) {
        return {
          message: state.message
        };
      }
    }
  };
});
