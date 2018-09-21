// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

defineParticle(({DomParticle, html}) => {

  const host = `basic-profile`;

  const template = html`

<div ${host}>
  <style>
    [${host}] {
      display: flex;
      min-height: calc(100vh - 56px);
    }
    [${host}] > [left] {
      flex: 1;
      min-width: 160px;
      padding: 16px;
      box-sizing: border-box;
      background-color: lightblue;
    }
    [${host}] > [right] {
      flex: 2;
    }
    [${host}] > [center] {
      text-align: center;
    }
    [${host}] > [left] > [avatar] > img {
      width: 92px;
      height: 92px;
      border: 2px solid black;
      border-radius: 50%;
    }
    [${host}] > [name] > cx-input {
      --shell-bg: lightblue;
    }
  </style>
  <div left>
    <div avatar center>
      <img src="../../assets/avatars/user (0).png">
    </div>
    <div name center>
      <cx-input>
        <input slot="input" id="nameInput" value="{{userName}}" on-change="onNameInputChange">
        <label slot="label" for="nameInput">User Name</label>
      </cx-input>
    </div>
  </div>
  <div right>
    <div slotid="friends"></div>
  </div>
</div>

  `;

  return class extends DomParticle {
    get template() {
      return template;
    }
    onNameInputChange(e) {
      this.updateVariable('userName', {userName: e.data.value});
    }
  };

});
