// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

defineParticle(({DomParticle, html, resolver}) => {

  const host = `basic-profile`;

  const template = html`

<div ${host}>
  <style>
    [${host}] {
      display: flex;
      flex-direction: column;
      min-height: calc(100vh);
    }
    [${host}] [center] {
      text-align: center;
    }
    [${host}] > [top] {
      padding: 16px 16px 32px 16px;
      min-width: 160px;
      box-sizing: border-box;
    }
    [${host}] > [bottom] {
      flex: 1;
      border-top: 1px solid silver;
      padding: 16px 16px 32px 16px;
    }
    [${host}] > [top] > [title] {
      text-align: left;
      padding-bottom: 16px;
    }
    [${host}] > [top] > [avatar] {
      display: inline-block;
    }
    [${host}] > [top] > [avatar] img {
      width: 156px;
      height: 156px;
      border: 1px solid black;
      border-radius: 50%;
    }
    [${host}] > [top] > [name] {
      padding-top: 32px;
    }
  </style>

  <div top center>
    <div title>My profile</div>
    <div avatar>
      <firebase-upload on-upload="onUpload">
        <img src="{{avatar}}">
      </firebase-upload>
    </div>
    <div name center>
      <div slotid="userName"></div>
    </div>
  </div>
  <div bottom>
    <div title>My friends</div>
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
        avatar: avatar && avatar.url || resolver(`https://$shell/assets/avatars/user (0).png`)
      };
    }
    onUpload(e) {
      this.updateVariable('avatar', {url: e.data.value.url});
    }
  };

});
