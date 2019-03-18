// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

// Define a simple particle that outputs a greeting message.
// This particle could have been replaced by another serialized
// view as is done with person.json.
defineParticle(({DomParticle}) => {
  return class extends DomParticle {
    constructor() { super(); }
    render(props, state) {
        console.log('Running hellowlrld');
        const Message = this.handles.get('hello').entityClass;
        this.handles.get('hello').set(new Message({message: 'Hello; World'}));

    }
  };
});
