// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

'use strict';

defineParticle(({DomParticle, html}) => {

  const host = `compose-message`;

  const template = html`

<style>
  [${host}] {
    display: flex;
    flex-direction: column;
    font-family: sans-serif;
    padding: 8px 0;
  }
  [${host}] input {
    padding: 8px 12px;
    box-sizing: border-box;
    width: calc(100% - 20px);
  }
</style>

<div ${host}>
  <input on-keypress="onKeypress" placholder="{{placeholder}}" value="{{message}}">
</div>

  `;

  return class extends DomParticle {
    get template() {
      return template;
    }
    render({messages, user}, state) {
      if (messages && user) {
        const model = {
          placeholder: `${user.name} says`,
          name: user.name,
          userid: user.id
        };
        if (state.committed) {
          state.committed = false;
          model.message = '';
        }
        return model;
      }
    }
    addMessage(msg) {
      const Message = this.handles.get('messages').entityClass;
      this.handles.get('messages').store(new Message(msg));
    }
    commit(value) {
      const {user} = this._props;
      if (value && user) {
        this.addMessage({
          content: value,
          name: user.name,
          userid: user.id,
          time: new Date().toLocaleTimeString()
        });
        this._setState({committed: true});
      }
    }
    onKeypress(e) {
      if (e.data.keys.key === 'Enter') {
        this.commit(e.data.value);
      }
    }
    onMessageChange(e) {
      //this.commit(e.data.value);
    }
    onClearChat() {
    }
  };
});