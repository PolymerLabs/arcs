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
      min-height: calc(100vh);
    }
    [${host}] [center] {
      text-align: center;
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
    [${host}] > [left] > [avatar] {
      padding: 32px 0;
    }
    [${host}] > [left] > [avatar] img {
      width: 92px;
      height: 92px;
      border: 2px solid black;
      border-radius: 50%;
    }
  </style>

  <div left>
    <div avatar center>
      <firebase-upload on-upload="onUpload">
        <img src="{{avatar}}">
      </firebase-upload>
    </div>
    <div name center>
      <div slotid="userName"></div>
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
    render({avatar}) {
      return {
        avatar: avatar && avatar.url || `../../assets/avatars/user (0).png`
      };
    }
    onUpload(e) {
      this.updateVariable('avatar', {url: e.data.value.url});
    }
  };

});
