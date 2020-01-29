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

 defineParticle(({SimpleParticle}) => {

//   const template = html`
// <input placeholder="Enter your name" spellcheck="false" on-change="onNameInputChange">
//   `;

  return class extends SimpleParticle {
    // get template() {
    //   return template;
    // }

    // Because we have some logic to implement, we use update instead of render.
    update({allMessages}) {
      //debugger;
      this.clear('filteredMessages');
      const messagesHandle = this.handles.get('filteredMessages');
      for (const messageData of allMessages) {
        if (messageData.sentTime < 24) {
          delete messageData['content'];
          messagesHandle.store(new messagesHandle.entityClass(messageData));
        }
      }
    }

    // onNameInputChange(e) {
    //   // Update the value of person when the human enters a value.
    //   //debugger;
    //   this.set('person', {name: e.data.value});
    // }
  };
});
