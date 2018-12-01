// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

defineParticle(({DomParticle, html, resolver}) => {

  const template = html`

<style>
  [grid] {
    text-align: center;
  }
  [item] {
    display: inline-block;
    width: 96px;
    padding: 8px;
    box-sizing: border-box;
    color: inherit;
    text-decoration: none;
    text-align: center;
  }
  [item] img {
    box-sizing: border-box;
    border-radius: 100%;
    width: 80px;
  }
  [item] [selected] {
    border: 3px solid blue;
  }
  [fab] {
    transform: translate(-32px, -64px);
    text-align: right;
    height: 0;
  }
  [fab] > * {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 56px;
    height: 56px;
    border-radius: 56px;
    box-sizing: border-box;
    font-size: 32px;
    padding-bottom: 2px;
    color: white;
    background-color: #1976D2;
    box-shadow: -2px 2px 16px -3px black;
  }
  [popup] {
    border: 1px solid silver;
    padding: 16px 8px;
    position: absolute;
    background-color: white;
    left: 16px;
    right: 16px;
    margin-top: 16px;
  }
  input {
    border: none;
    background-color: inherit;
    font-size: 1.7em;
    padding: 4px 12px;
    outline: none;
  }
</style>

<template friend-avatars>
  <div item>
    <img selected$="{{selected}}" src="{{url}}" key="{{key}}" value="{{value}}" on-click="onSelectAvatar">
    <br>
    <span>{{name}}</span>
  </div>
</template>

<div friends-picker>
  <div fab><icon on-click="onAddFriend">add</icon></div>
  <div popup xen:style="{{popupStyle}}">
    <input autofocus="{{showPopup}}" value="{{newFriendName}}" placeholder="Enter New Friend Id" spellcheck="false" on-change="onNameInputChange">
  </div>
  <div grid>{{avatars}}</div>
</div>

  `;

  return class extends DomParticle {
    get template() {
      return template;
    }
    render(props, state) {
      const user = props.user || {};
      const friends = props.friends || [];
      //const people = (props.users || []).filter(p => p.id !== user.id);
      const others = (props.friends || []).filter(p => p.id !== user.id);
      const avatars = props.avatars || [];
      const avatarModels = others.map((p, i) => {
        const avatar = this.boxQuery(avatars, p.id)[0];
        const url = (avatar && avatar.url) || `https://$shell/assets/avatars/user%20(0).png`;
        return {
          key: i,
          value: p.id,
          name: p.name || p.id,
          url: resolver && resolver(url),
          selected: true //Boolean(friends.find(f => f.id === p.id))
        };
      });
      return {
        showPopup: state.showPopup,
        popupStyle: `display: ${state.showPopup ? 'block' : 'none'};`,
        newFriendName: '',
        avatars: {
          $template: 'friend-avatars',
          models: avatarModels
        }
      };
    }
    onAddFriend(e) {
      this.setState({showPopup: true});
    }
    onNameInputChange({data: {value}}) {
      this.setState({showPopup: false});
      if (value) {
        const friend = this.props.friends.find(f => f.id === value);
        if (!friend) {
          this.appendRawDataToHandle('friends', [{id: value}]);
          //const friendsHandle = this.handles.get('friends');
          //friendsHandle.store(new friendsHandle.entityClass({id: value}));
        }
      }
    }
    onSelectAvatar(e, state) {
      // const selectedId = e.data.value;
      // const friend = this._props.friends.find(f => f.id === selectedId);
      // const friendsHandle = this.handles.get('friends');
      // if (friend) {
      //   friendsHandle.remove(friend);
      // } else {
      //   friendsHandle.store(new friendsHandle.entityClass({id: selectedId}));
      // }
    }
  };

});
