// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

defineParticle(({DomParticle, html, resolver}) => {

  const host = `friends-picker`;

  const template = html`

<div ${host}>
  <style>
    [${host}] [grid] {
      text-align: center;
    }
    [${host}] [item] {
      display: inline-block;
      width: 96px;
      padding: 8px;
      box-sizing: border-box;
      color: inherit;
      text-decoration: none;
      text-align: center;
    }
    [${host}] [item] img {
      box-sizing: border-box;
      border-radius: 100%;
      width: 80px;
    }
    [${host}] [item] [selected] {
      border: 3px solid blue;
    }
  </style>
  <div grid>{{avatars}}</div>
</div>

<template friend-avatars>
  <div item>
    <img selected$="{{selected}}" src="{{url}}" key="{{key}}" value="{{value}}" on-Click="_onSelectAvatar">
    <br>
    <span>{{name}}</span>
  </div>
</template>

  `;

  return class extends DomParticle {
    get template() {
      return template;
    }
    render(props, state) {
      const user = props.user || {};
      const friends = props.friends || [];
      const people = (props.users || []).filter(p => p.id !== user.id);
      const avatars = props.avatars || [];
      //console.log('%cFriendsPicker: avatars.length=', 'background-color: silver; padding: 4px 8px; border-radius: 4px', avatars.length);
      let avatarModels = people.map((p, i) => {
        const avatar = this.boxQuery(avatars, p.id)[0];
        //let avatar = avatars.find(a => a.owner === p.id);
        //console.log(p.id, avatar, avatars);
        const url = (avatar && avatar.url) || `https://$shell/assets/avatars/user (0).png`;
        return {
          key: i,
          value: p.id,
          name: p.name || p.id,
          url: resolver && resolver(url),
          selected: Boolean(friends.find(f => f.id === p.id))
        };
      });
      return {
        avatars: {
          $template: 'friend-avatars',
          models: avatarModels
        }
      };
    }
    _onSelectAvatar(e, state) {
      let selectedId = e.data.value;
      let friend = this._props.friends.find(f => f.id === selectedId);
      let friendsHandle = this.handles.get('friends');
      if (friend) {
        friendsHandle.remove(friend);
      } else {
        friendsHandle.store(new friendsHandle.entityClass({id: selectedId}));
      }
    }
  };

});
