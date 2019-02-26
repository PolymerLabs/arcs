/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

defineParticle(({DomParticle, html}) => {

  const host = `user-name-form`;

  const template = html`

<div ${host}>
  <style>
    [${host}] {
      /* display: flex;
      flex-direction: column; */
    }
    [${host}] > input {
      border: none;
      /* border-bottom: 1px solid gray; */
      text-align: center;
      background-color: inherit;
      font-size: 1.7em;
      padding: 4px 12px;
      cursor: pointer;
    }
    [${host}] > input:focus {
      cursor: auto;
      outline: none;
      /* text-align: left; */
      background-color: white;
      font-weight: normal;
      box-shadow: 1px 1px 3px 1px rgba(0,0,0,0.1);
    }
  </style>
  <input value="{{userName}}" placeholder="User Name" spellcheck="false" on-change="onNameInputChange">
</div>

  `;

  return class extends DomParticle {
    get template() {
      return template;
    }
    render({userName}) {
      return {
        userName: userName ? userName.userName : ''
      };
    }
    onNameInputChange(e) {
      this.updateVariable('userName', {userName: e.data.value});
    }
  };

});
