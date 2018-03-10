// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

'use strict';

defineParticle(({DomParticle}) => {

  let template = `
    <a-entity id={{subId}}>{{inner}}</a-entity>

    <template chat>
      <a-text id$="{{name}}" value$="{{message}}"></a-text>
    </template>

    <template mustache>
      <a-image src$="{{message}}" id$="{{name}}" opacity$="{{opacity}}" position$="{{position}}"></a-image>
    </template>

  `.trim();

  let mustache = {
    Scott: {
      position: '0.217 -1.8 0',
    },
    Noe: {
      position: '0.709 -1.3 0.43',
    },
    Berni: {
      position: '0.695 -1.3 0',
    },
    Mike: {
      position: '0.886 -1.635 0',
    },
    Shane: {
      position: '0.582 -2 0.259',
    },
    Doug: {
      position: '0.820 -2.047 -0.98',
    },
  };

  return class extends DomParticle {
    get template() {
      return template;
    }
    _getInitialState() {
      return {
        latest: new Map()
      };
    }
    get mode() {
      if (this.config.slotNames.find(m => m == 'mouth')) {
        return 'mustache';
      } else if (this.config.slotNames.find(m => m == 'topofhead')) {
        return 'chat';
      }
    }
    willReceiveProps(props) {
      if (props.participants && props.participants.length && props.messages && props.messages.length) {
        let latest = new Map();
        props.messages.forEach(c => {
          if (c.content &&
              (this.mode == 'mustache' && c.type == 'mustache') ||
              (this.mode == 'chat' && !c.type)) {
            latest.set(c.name, c.content);
          }
        });
        this._setState({latest});
      }
    }
    render(props, state) {
      if (state.latest && props.participants) {
        return {
          items: props.participants.map(p => this._renderInner(p, state.latest.get(p.name)))
        };
      }
    }
    _renderInner(p, message) {
      if (message !== undefined) {
        let model = {name: p.name, message};
        if (this.mode == 'mustache') {
          model.position = mustache[p.name] ? mustache[p.name].position : '';
          model.opacity = '1';
        }
        return {
          subId: p.name,
          inner: {
            $template: this.mode,
            models: [model],
          }
        };
      } else {
        return {
          subId: p.name,
        };
      }
    }
  };
});
