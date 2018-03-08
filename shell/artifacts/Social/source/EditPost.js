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

defineParticle(({DomParticle, log}) => {
  const host = `social-edit-post`;

  const template = `
<style>
[${host}] textarea {
  border: none;
  font-family: 'Google Sans', sans-serif;
  font-size: 16pt;
  /* TODO(wkorman|sjmiles): Rework in conjunction with DetailSlider to allow
     something functionally like height: 100%. */
  height: 300px;
  width: 100%;
  outline: none;
  resize: none;
}
[${host}] {
  font-family: 'Google Sans', sans-serif;
  padding: 8px;
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
    <i class="material-icons" on-click="_onDeletePost">delete</i>
    <i class="material-icons" on-click="_onAttachPhoto">attach_file</i>
    <i class="{{saveClasses}}" on-click="_onSavePost">done</i>
  </div>
  <textarea on-change="_onCaptureText" value="{{message}}" on-input="_onUpdatePostButtonState"></textarea>
</div>
  `.trim();

  return class extends DomParticle {
    get template() {
      return template;
    }
    _getInitialState() {
      return {message: ''};
    }
    _willReceiveProps(props) {
      if (props.user) {
        this._setState({user: props.user});
      }
    }
    _update(props, state, lastProps, lastState) {
      const {post} = props;
      // TODO(wkorman): We have to use update here because we need lastProps
      // which isn't currently available in _render. The overall hijinks in
      // which we engage below are in order to make sure we only update the
      // textarea text when a new message is supplied by WritePosts. An
      // alternate implementation could be to scrutinize the message id and if
      // it changes we know it's time to start over and so we clear everything
      // out.
      const lastMessage = lastProps.post ? lastProps.post.message : null;
      state.textMessage = null;
      if (post && post.message !== lastMessage) {
        state.textMessage = post.message;
        this._updateSaveButton(post.message);
      }
      super._update(props, state, lastProps, lastState);
    }
    _render({post}, state) {
      let saveClasses = ['material-icons'];
      if (state.saveButtonActive) {
        saveClasses.push('button-live');
      }
      saveClasses = saveClasses.join(' ');
      const model = {saveClasses};
      if (state.textMessage !== null) {
        model.message = state.textMessage;
      }
      return model;
    }
    _updateSaveButton(message) {
      this._setState({saveButtonActive: message.trim().length > 0});
    }
    _onUpdatePostButtonState(e, state) {
      this._updateSaveButton(e.data.value);
    }
    // TODO(wkorman): Add onDeletePost, onAttachPost.
    _onSavePost(e, state) {
      const Post = this._views.get('posts').entityClass;
      this._views.get('post').set(new Post({
        message: state.message,
        createdTimestamp: Date.now(),
        author: state.user.id
      }));
    }
    _onCaptureText(e, state) {
      if (state.message !== e.data.value) {
        this._setState({message: e.data.value});
      }
    }
  };
});
