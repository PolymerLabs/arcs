// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

defineParticle(({Particle, MultiplexerDomParticle, html}) => {

  const host = `muxed-list`;

  const template = html`

<div ${host} style="padding: 8px;">
  <style>
    [${host}] {
      max-width: 400px;
      margin: 0 auto;
    }
    [${host}] > [list] {
      background-color: white;
    }
    [${host}] > [list] > [item] {
      /* no padding/margin/etc so the item can use full bleed */
      border-top: 1px solid #eeeeee;
    }
    [${host}] > [list] > [item]:last-child {
      border-bottom: 1px solid #eeeeee;
    }
    [${host}] > [list] > [item][selected] {
      background-color: whitesmoke;
    }
    [${host}] div[slotid="annotation"] {
      font-size: 0.75em;
    }
    [${host}] > [list] p {
      margin: 0;
    }
    [${host}] [empty] {
      color: #aaaaaa;
      font-size: 14px;
      font-style: italic;
      padding: 10px 0;
    }

  </style>

  <div empty hidden="{{hasItems}}">List is empty</div>
  <div list>{{list}}</div>

  <template list>
    <div item selected$="{{selected}}">
      <div slotid="item" subid="{{subId}}" key="{{subId}}" on-click="_onSelect"></div>
    </div>
  </template>
</div>
  `;

  return class MuxedList extends MultiplexerDomParticle {
    constructInnerRecipe(hostedParticle, item, itemHandle, slot, other) {
      let recipe = Particle.buildManifest`
${hostedParticle}
recipe
  use '${itemHandle._id}' as handle1
  ${other.handles.join('\n')}
  slot '${slot.id}' as slot1
  ${hostedParticle.name}
    ${hostedParticle.connections[0].name} <- handle1
    ${other.connections.join('\n')}
    consume ${slot.name} as slot1
  `;
        return recipe;
    }

    getTemplate(slotName) {
      if (slotName == 'main')
        return this.template;
      if (slotName == 'item') {
        // TODO: this is a hack, the particle should host recipe, instead of a particle.
        let templates = {};
        // Inside each template, provide an annotation slot.
        Object.keys(this._state.template).forEach(subId => templates[subId] = this._state.template[subId].concat('<div slotid="annotation" subid="{{subId}}"></div>'));
        return templates;
      } else {
        return this._state.template;
      }
    }
    getTemplateName(slotName) {
      return slotName == 'main' ? `default` : this._state.templateName;
    }

    get template() { return template; }

    render({list, selected}, state) {
      const selectedId = selected && selected.id;
      return Object.assign({}, state.renderModel, {
        hasItems: list.length > 0,
        list: {
          $template: 'list',
          models: list.map(item => ({
            subId: item.id,
            selected: selectedId === item.id
          }))
        }
      });
    }

    _onSelect(e) {
      const item = this._props.list.find(i => i.id === e.data.key);
      const selected = this.handles.get('selected');
      if (item && selected) {
        selected.set(item);
      }
    }
  };
});
