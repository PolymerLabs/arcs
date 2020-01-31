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

function filter(messages, to, unorderedPeople) {
  const frequency = {};
  messages.forEach(function(value) { frequency[value.fromID] = 0; });
  messages.forEach(function(value) { frequency[value.fromID]++; });
  const peopleData = unorderedPeople.filter(function(value) {
    return frequency[value.id] > 0;
  });
  return peopleData.sort(function(a, b) {
      return frequency[b.id] - frequency[a.id];
  });
}

let to = '1';

 defineParticle(({SimpleParticle, html}) => {

  const template = html`
  <div style="display:flex;flex-direction:column;align-items:left;padding:1em;">
    Receiver:
    <textarea spellcheck="false" on-change="onFromDataChange">${JSON.stringify(to)}</textarea>
  </div>
  `;

  return class extends SimpleParticle {
    get template() {
      return template;
    }

    // Because we have some logic to implement, we use update instead of render.
    update({messages, unorderedPeople}) {
      this.clear('orderedPeople');
      const res = filter(messages, to, unorderedPeople);
      const peopleHandle = this.handles.get('orderedPeople');
      let index = 0;
      for (const personData of res) {
        peopleHandle.store(new peopleHandle.entityClass({name: personData.name, id: personData.id, index}));
        index += 1;
      }
    }

    onFromDataChange(e) {
      to = e.data.value;
    }
  };
});
