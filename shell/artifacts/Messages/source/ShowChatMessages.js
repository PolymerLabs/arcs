// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

"use strict";

defineParticle(({DomParticle, resolver}) => {

  const host = `show-chat-messages`;

  const template = `
<style>
  [${host}] {
    display: flex;
    flex-direction: column;
    font-family: sans-serif;
    font-size: 16px;
    padding: 0 20px;
    max-height: 400px;
    overflow-x: hidden;
    overflow-y: auto;
  }
  [${host}] [list] {
    flex: 1;
  }
  [${host}] [avatar] img {
    height: 32px;
    border-radius: 100%;
    vertical-align: middle;
    margin: 0 8px;
  }
  [${host}] [message] {
    padding-bottom: 8px;
    text-align: right;
  }
  [${host}] [message][isme] {
    text-align: left;
  }
  [${host}] [name] {
    padding: 8px;
    font-size: 0.7em;
    min-height: 18px;
  }
  [${host}] [isme] [avatar] {
    /*display: none;*/
  }
  [${host}] [content] {
    display: inline-block;
    font-size: 0.9em;
    line-height: 1.4em;
    text-align: justify;
    background-color: #eeeeee;
    border-radius: 16px;
    padding: 4px 16px;
  }
  [${host}] [isme] [content] {
    color: #f8f8f8;
    background-color: #1873cd;
  }
  [${host}] [iscustom] {
    display: none;
  }
</style>

<div ${host} scrolltop="{{scrollTop:scrollTop}}">
  <template chat-message>
    <div message isme$="{{isme}}">
      <div name><span avatar><b>{{name}}</b><img src="{{src}}" title="{{name}}" alt="{{name}}"></span><i>{{blurb}}</i></div>
      <div content iscustom$="{{iscustom}}">{{content}}</div>
      <div slotid="custom_message" subid$="{{subId}}"></div>
    </div>
  </template>
  <div list>{{messages}}</div>
</div>
  `.trim();

  return class extends DomParticle {
    get template() {
      return template;
    }
    get userName() {
      return this._props.user && this._props.user.name || '';
    }
    _render(props) {
      let {messages, user, avatars} = props;
      if (messages && user) {
      	return {
          scrollTop: 1e6,
          messages: {
            $template: 'chat-message',
            models: this.renderMessages(messages, user, avatars || [])
          }
      	};
      }
    }
    renderMessages(messages, user, avatars) {
      return messages.map((m, i) => {
        let avatar = avatars.find(a => a.owner == m.userid);
        let src = avatar ? avatar.url : `https://$cdn/assets/avatars/user.jpg`;
        return {
          iscustom: Boolean(m.type && m.type.length),
          content: m.content,
          name: m.name,
          subId: i,
          blurb: m.time || '',
          isme: m.name === user.name,
          src: resolver(src)
        };
      });
    }
  };
});