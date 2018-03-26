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
    <icon on-click="onDeletePost">delete</icon>
    <firebase-upload active accept="image/*" on-upload="onAttachPhoto"><icon>attach_file</icon></firebase-upload>
    <icon primary active$="{{saveButtonActive}}" on-click="onSavePost">done</icon>
  </div>
  <img src="{{image}}">
  <textarea value="{{message}}" on-input="onTextInput"></textarea>
</div>`;

  return class extends DomParticle {
    get template() {
      return template;
    }
    render({user, post}, {message, image, savePost}) {
      if (savePost) {
        this.savePost(user, message, image);
      }
      const saveButtonActive = Boolean(message && (message.trim().length > 0));
      const model = {saveButtonActive, message: message || '', image: image || ''};
      return model;
    }
    setHandle(name, data) {
      const handle = this._views.get(name);
      handle.set(new (handle.entityClass)(data));
    }
    savePost(user, message, image) {
      this.setHandle(
          'post',
          {message, image, createdTimestamp: Date.now(), author: user.id});
      this.setState({savePost: false, message: '', image: ''});
    }
    onTextInput(e) {
      this.setIfDirty({message: e.data.value});
    }
    // TODO(wkorman): Add onDeletePost.
    onSavePost(e) {
      this.setIfDirty({savePost: true});
    }
    onAttachPhoto(e) {
      const image = e.data.value;
      this.setIfDirty({image});
    }
  };
});
