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

 let messagesData = [
  {
    'toID': '1',
    'fromID': '2',
    'content': 'Text',
    'sentTime': 12,
  },
  {
    'toID': '1',
    'fromID': '3',
    'content': 'Text',
    'sentTime': 11,
  },
  {
    'toID': '1',
    'fromID': '3',
    'content': 'Text2',
    'sentTime': 10,
  },
  {
    'toID': '1',
    'fromID': '1',
    'content': 'Text',
    'sentTime': 25,
  }
];

 defineParticle(({SimpleParticle, html}) => {

  const template = html`
  <div style="display:flex;flex-direction:column;align-items:left;padding:1em;">
    Messages:
    <textarea rows="10" cols="70" spellcheck="false" on-change="onMessagesDataChange">${JSON.stringify(messagesData, undefined, 2)}</textarea>
    <button id="myButton" on-click="triggerDataFlow">Go!</button>
  </div>
  `;

  return class extends SimpleParticle {
    get template() {
      return template;
    }

    // Because we have some logic to implement, we use update instead of render.
    update() {
      this.clear('messages');
      const messagesHandle = this.handles.get('messages');
      for (const messageData of messagesData) {
        messagesHandle.store(new messagesHandle.entityClass(messageData));
      }
    }

    onMessagesDataChange(e) {
      messagesData = JSON.parse(e.data.value);
      this.clear('messages');
      const messagesHandle = this.handles.get('messages');
      for (const messageData of messagesData) {
        messagesHandle.store(new messagesHandle.entityClass(messageData));
      }
    }

    triggerDataFlow() {
      console.log('yoo');
      this.clear('messages');
      const messagesHandle = this.handles.get('messages');
      for (const messageData of messagesData) {
        messagesHandle.store(new messagesHandle.entityClass(messageData));
      }
    }

  };
});
