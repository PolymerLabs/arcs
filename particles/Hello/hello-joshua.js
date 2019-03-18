// Copyright (c) 2018 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

defineParticle(({DomParticle, html}) => {
  const rootTemplate = html`
  <script src="foo.js"></script>
  <div><a href="https://www.youtube.com/watch?v=ecPeSmF_ikc">Greetings Professor Faukin.</a>
    <iframe width="560" height="315" 
      src="https://www.youtube-nocookie.com/embed/KXzNo0vR_dU?rel=0" 
      frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>
  </div>`;

  return class extends DomParticle {
    constructor() {
      super();
    }

    getTemplate(slotName) {
      return rootTemplate;
    }

    render(props, state) {
      return state;
    }
  };
});