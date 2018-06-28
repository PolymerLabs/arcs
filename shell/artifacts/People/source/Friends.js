// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

defineParticle(({DomParticle, html, log, resolver}) => {

  const host = 'friends';

  const template = html`
<style>
  [${host}] {
    font-size: 0.75em;
  }
  [${host}] [section] {
    padding: 8px;
  }
  [${host}] [item] {
    Xborder-bottom: 1px dotted silver;
    cursor: pointer;
    Xdisplay: flex;
    Xalign-items: center;
  }
</style>

<div ${host}>
  <h2>My Friends</h2>

  <ul>{{people}}</ul>

  <template people>
    <div item section on-click="_onSelect" key="{{index}}">
      <li>
        <div>{{name}}</div>
        <ul>{{avatars}}</ul>
        <h4>Friends of <span>{{name}}</span></h4>
        <ul>{{friends}}</ul>
      </li>
    </div>
  </template>

  <template friend>
    <li><div>{{name}}</div></li>
  </template>

  <template avatar>
    <li><img style="vertical-align: middle; height: 64px; border-radius: 50%;" src="{{url}}"></li>
  </template>
</div>
    `;

  return class extends DomParticle {
    get template() {
      return template;
    }
    render(props, state) {
      const model = {
        people: ''
      };
      if (props.friends && props.people && props.avatars) {
        const friends = props.friends.map(friend => this.friendToModel(friend));
        model.people = {
          $template: 'people',
          models: friends
        };
      }
      return model;
    }
    friendToModel(friend) {
      const {people, avatars} = this._props;
      const friendsOfFriend = people.filter(person => {
        const ownerid = person.$id.split('|')[0];
        return friend.id === ownerid;
      });
      const avatarsOfFriend = avatars.filter(person => {
        const ownerid = person.$id.split('|')[0];
        return friend.id === ownerid;
      });
      return {
        name: friend.name,
        avatars: {
          $template: 'avatar',
          models: avatarsOfFriend.map(avatar => ({url: resolver(avatar.url)}))
        },
        friends: {
          $template: 'friend',
          models: friendsOfFriend.map(friend => ({name: friend.id}))
        }
      };
    }
  };

});
