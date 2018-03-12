/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

'use strict';

defineParticle(({DomParticle, html, log}) => {

  const host = `social-edit-post`;

  const template = html`
<style>
[${host}] {
  font-family: 'Google Sans', sans-serif;
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 56px 8px 8px 8px;
}
[${host}] img {
  display: block;
  width: 256px;
}
[${host}] textarea {
  flex: 1;
  border: none;
  font-family: 'Google Sans', sans-serif;
  font-size: 16pt;
  outline: none;
  resize: none;
}
[${host}] [post-buttons] {
  position: absolute;
  right: 8px;
  top: 8px;
}
[${host}] [post-buttons] > * {
  border-radius: 100%;
  color: lightgrey;
  display: inline-block;
  padding: 8px;
}
[${host}] [post-buttons] > *:active {
  background-color: #b0e3ff;
}
[${host}] [post-buttons] > [active] {
  color: black;
}
[${host}] [post-buttons] > [active][primary] {
  color: green;
}
</style>
<div ${host}>
  <div post-buttons>
    <i class="material-icons" on-click="onDeletePost">delete</i>
    <firebase-upload active accept="image/*" on-upload="onAttachPhoto"><i class="material-icons">attach_file</i></firebase-upload>
    <i class="material-icons" primary active$="{{saveButtonActive}}" on-click="onSavePost">done</i>
  </div>
  <img src="{{imageUrl}}">
  <textarea value="{{message}}" on-input="onTextInput"></textarea>
</div>
  `.trim();

  return class extends DomParticle {
    get template() {
      return template;
    }
    willReceiveProps({post}, state) {
      state.message = post && post.message;
    }
    render({user, post}, {message, savePost, imageUrl}) {
      if (savePost) {
        this.savePost(user, message);
      }
      const saveButtonActive = message && (message.trim().length > 0);
      const model = {
        saveButtonActive,
        message,
        imageUrl: imageUrl || ''
      };
      return model;
    }
    setHandle(name, data) {
      const handle = this._views.get(name);
      handle.set(new (handle.entityClass)(data));
    }
    savePost(user, message) {
      this.setHandle('post', {
        message: message,
        createdTimestamp: Date.now(),
        author: user.id
      });
      this.setState({savePost: false});
    }
    onTextInput(e) {
      this.setIfDirty({message: e.data.value});
    }
    // TODO(wkorman): Add onDeletePost.
    onSavePost(e) {
      this.setIfDirty({savePost: true});
    }
    onAttachPhoto(e) {
      log(`image uploaded: `, e.data.value);
      this.setState({imageUrl: e.data.value});
    }
  };
});
