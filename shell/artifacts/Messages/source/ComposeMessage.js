// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

"use strict";

defineParticle(({DomParticle}) => {

  const host = `compose-message`;

  const template = `
<style>
  [${host}] {
    display: flex;
    flex-direction: column;
    font-family: sans-serif;
  }
  /*[${host}] [compose] div {
    padding-bottom: 4px;
  }*/
  [${host}] [compose] input {
    padding: 8px 12px;
    margin: 8px;
    box-sizing: border-box;
    width: calc(100% - 20px);
  }
</style>

<div ${host}>
  <div compose>
    <!--<div><b>{{name}}</b> says</div>-->
    <input on-change="onMessageChange" placholder="{{placeholder}}" value="{{message}}">
  </div>
</div>
  `.trim();

  return class extends DomParticle {
    get template() {
      return template;
    }
    _render(props) {
      let {messages, user} = props;
      if (messages && user) {
      	return {
          placeholder: `${user.name} says`,
          message: '',
          name: user.name,
          userid: user.id
      	};
      }
    }
    addMessage(msg) {
      const Message = this._views.get('messages').entityClass;
      this._views.get('messages').store(new Message(msg));
    }
    onMessageChange(e) {
      let user = this._props.user;
      if (e.data.value && user) {
        this.addMessage({
          content: e.data.value,
          name: user.name,
          userid: user.id,
          time: new Date().toLocaleTimeString()
        });
        this._setState({message: ''});
      }
    }
    onClearChat() {
    }
  };
});