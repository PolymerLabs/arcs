// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

// PersonalGreet defines a particle that displays a more personal greeting
// message than simply "Hello, World!". It displays "Hi {{name}}, you're an
// {{animal}}" for a given Person entity. The animal is chosen based on the
// first letter of the person's name.
defineParticle(({DomParticle, html}) => {

  const template = html`
    <style>
      [greeting] {
        background-color: #FFF176;
        width: 50%;
        height: 100px;
        margin: 20px;
        padding: 10px;
      }
    </style>
    <div greeting>Hi <span>{{name}}</span>, youre <span>{{prefix}}</span>&nbsp;<span>{{animal}}</span>!</div>`;

  const animals = {
    'A': 'alligator',
    'B': 'bear',
    'C': 'cat',
    'D': 'dolphin',
    'M': 'marsupial',
    'S': 'seahorse',
    // ...
    'Z': 'zebra',
    '': 'alian',
  };

  const vowels = ['a', 'e', 'i', 'o', 'u'];

  return class extends DomParticle {
    constructor() { super(); }

    get template() {
      return template;
    }

    render(props, state) {
        console.log('render called');
        if (props.person) {
        const name = props.person.name;
        const animal = animals[name.toUpperCase()[0]] || animals[''];
        console.log('name is ' + name);
        return {
          name: name,
          animal: animal,
          prefix: vowels.includes(animal[0]) ? 'an' : 'a'
        };
      }
    }
  };
});

