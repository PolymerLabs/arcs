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
  padding: 56px 8px 8px 8px;
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
[${host}] [post-buttons] i {
  border-radius: 100%;
  color: lightgrey;
  display: inline-block;
  padding: 8px;
}
[${host}] [post-buttons] i:active {
  background-color: #b0e3ff;
}
[${host}] [post-buttons] .button-live {
  color: green;
}
</style>
<div ${host}>
  <div post-buttons>
    <i class="material-icons" on-click="onDeletePost">delete</i>
    <i class="material-icons" on-click="onAttachPhoto">attach_file</i>
    <i class="{{saveClasses}}" on-click="onSavePost">done</i>
  </div>
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
    render({user, post}, {message, savePost}) {
      if (savePost) {
        this.savePost(user, message);
      }
      const saveButtonActive = message && (message.trim().length > 0);
      const model = {
        saveClasses: saveButtonActive ? 'material-icons button-live' : 'material-icons',
        message
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
    // TODO(wkorman): Add onDeletePost, onAttachPost.
    onSavePost(e) {
      this.setIfDirty({savePost: true});
    }
  };
});
