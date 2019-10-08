/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

defineParticle(({SimpleParticle, html, resolver, log}) => {

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
  [item] span {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  [item] img {
    box-sizing: border-box;
    border-radius: 100%;
    width: 80px;
    height: 80px;
    background-color: #eeeeee;
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
  model-input {
    display: block;
  }
  input {
    display: block;
    box-sizing: border-box;
    width: 100%;
    border: none;
    background-color: inherit;
    font-size: 1.7em;
    padding: 4px 12px;
    outline: none;
  }
</style>

<template friend-avatars>
  <div item title$="{{publicKey}}">
    <model-img src="{{url}}">
      <img selected$="{{selected}}" key="{{key}}" value="{{publicKey}}" on-dblclick="onRemoveFriend">
    </model-img>
    <br>
    <span>{{name}}</span>
  </div>
</template>

<div friends-picker>
  <div fab><icon on-click="onAddFriend">add</icon></div>
  <div popup xen:style="{{popupStyle}}">
    <model-input focus="{{showPopup}}" on-cancel="onCancelInput">
      <input value="{{newFriendName}}" placeholder="Enter New Friend Id" spellcheck="false" on-change="onNameInputChange">
    </model-input>
  </div>
  <div grid>{{friendModels}}</div>
</div>

  `;

  return class extends SimpleParticle {
    get template() {
      return template;
    }
    willReceiveProps(props) {
      this.calcFriendModels(props);
    }
    render(props, {showPopup, friendModels}) {
      return {
        friendModels,
        newFriendName: '',
        showPopup: showPopup,
        popupStyle: `display: ${showPopup ? 'block' : 'none'};`
      };
    }
    async calcFriendModels({friends, avatars, userNames}) {
      if (friends) {
        const promises = friends.map(async (friend, i) => {
          const profile = await this.getUserProfile(friend.publicKey, avatars, userNames);
          return {
            key: i,
            publicKey: profile.publicKey,
            name: profile.name,
            url: profile.avatar
          };
        });
        const friendModels = {
          $template: 'friend-avatars',
          models: await Promise.all(promises)
        };
        this.setState({friendModels});
      }
    }
    async getUserProfile(publicKey, avatars, names) {
      const avatar = (await this.boxQuery(avatars, publicKey))[0];
      const name = (await this.boxQuery(names, publicKey))[0];
      return {
        publicKey,
        avatar: (avatar && avatar.url) || resolver(`FriendsPicker/../assets/user.png`),
        name: (name && name.userName) || publicKey.split('/').pop()
      };
    }
    onAddFriend(e) {
      this.setState({showPopup: true});
    }
    onCancelInput() {
      this.setState({showPopup: false});
    }
    onNameInputChange({data: {value}}) {
      this.setState({showPopup: false});
      if (value) {
        const friend = this.props.friends.find(f => f.publicKey === value);
        if (!friend) {
          this.add('friends', [{publicKey: value}]);
        }
      }
    }
    onRemoveFriend(e, state) {
      const selectedId = e.data.value;
      const friend = this._props.friends.find(f => f.publicKey === selectedId);
      const friendsHandle = this.handles.get('friends');
      if (friend) {
        friendsHandle.remove(friend);
      }
    }
  };

});
