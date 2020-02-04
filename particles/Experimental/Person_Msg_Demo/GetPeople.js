/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

 /* global defineParticle */

let peopleData = [
  {'name': 'Jill', 'age': 70, 'id': '1'},
  {'name': 'Jack', 'age': 25, 'id': '2'},
  {'name': 'Jen', 'age': 50, 'id': '3'},
];

 defineParticle(({SimpleParticle, html}) => {

  const template = html`
    <div style="display:flex;flex-direction:column;align-items:left;padding:1em;">
    People:
    <textarea rows="10" cols="50" spellcheck="false" on-change="onPeopleDataChange">${JSON.stringify(peopleData, undefined, 2)}</textarea>
    </div>
  `;

  return class extends SimpleParticle {
    get template() {
      return template;
    }

    // Because we have some logic to implement, we use update instead of render.
    update() {
      this.clear('people');
      const peopleHandle = this.handles.get('people');
      for (const personData of peopleData) {
        peopleHandle.store(new peopleHandle.entityClass(personData));
      }
    }

    onPeopleDataChange(e) {
      peopleData = JSON.parse(e.data.value);
      this.clear('people');
      const peopleHandle = this.handles.get('people');
      for (const personData of peopleData) {
        peopleHandle.store(new peopleHandle.entityClass(personData));
      }
    }
  };
});
