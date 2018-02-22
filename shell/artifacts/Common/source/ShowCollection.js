// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

'use strict';

defineParticle(({TransformationDomParticle, resolver}) => {

  let host = `show-collection`;

  let styles = `
  <style>
  [${host}] {
    padding: 16px;
    background-color: white;
  }
  [${host}] > [head] {
    display: flex;
    align-items: center;
    padding: 8px 0;
    color: #aaaaaa;
    font-weight: bold;
  }
  [${host}] > [items] [item] {
    padding: 4px 8px;
    background-color: white;
    border-bottom: 1px solid #eeeeee;
  }
  [${host}] > [items] [item]:last-child {
    border: none;
  }
  [${host}] div[slotid="annotation"] {
    font-size: 0.7em;
  }
  [${host}] [empty] {
    color: #aaaaaa;
    font-size: 14px;
    font-style: italic;
    padding: 10px 0;
  }
  [${host}] [items] p {
    margin: 0;
  }
  </style>
  `;

  let template = `
  ${styles}
<div ${host}>
  <div head>
    <span>Your shortlist</span>
  </div>

  <div slotid="preamble"></div>

  <div empty hidden="{{hasItems}}">List is empty</div>

  <template items>{{hostedParticle}}</template>
  <div items>{{items}}</div>

  <div slotid="action"></div>

  <div slotid="postamble"></div>
</div>
    `.trim();

  return class extends TransformationDomParticle {
    constructor() {
      super();
      this._itemSubIdByHostedSlotId = new Map();
    }
    get template() { return template; }
    async setViews(views) {
      this.handleIds = {};
      this._views = views;
      this._template = null;
      let arc = await this.constructInnerArc();

      this.on(views, 'collection', 'change', async (e) => {
        let collectionHandle = views.get('collection');
        let collection = await collectionHandle.toList();

        this.relevance = 0.1;

        let hostedParticle = await views.get('hostedParticle').get();
        for (let [index, item] of collection.entries()) {
          if (this.handleIds[item.id]) {
            let itemView = await this.handleIds[item.id];
            itemView.set(item);
            continue;
          }

          let itemViewPromise = arc.createHandle(collectionHandle.type.primitiveType(), 'item' + index);
          this.handleIds[item.id] = itemViewPromise;
          let itemView = await itemViewPromise;

          let hostedSlotName = [...hostedParticle.slots.keys()][0];
          let slotName = [...this.spec.slots.values()][0].name;
          let slotId = await arc.createSlot(this, slotName, hostedParticle.name, hostedSlotName);
          if (!slotId) {
            continue;
          }

          this._itemSubIdByHostedSlotId.set(slotId, item.id);

          let recipe = `
${this.serializeSchema(hostedParticle)}
recipe
  use '${itemView._id}' as v1
  slot '${slotId}' as s1
  ${hostedParticle.name}
    ${hostedParticle.connections[0].name} <- v1
    consume ${hostedSlotName} as s1
          `;

          try {
            itemView.set(item);
            await arc.loadRecipe(recipe, this);
          } catch (e) {
            console.log(e);
          }
        }

        // Update props of all particle's views.
        this._updateAllViews(views, this.config);
      });

    }
    _willReceiveProps(props) {
      let propsItems = TransformationDomParticle.propsToItems(props.collection);

      this._updateRenderModel(propsItems, this._state.hostedItems || []);

      if (propsItems.length == 0 && !this._state.template) {
        this._setState({template: this.template});
      }

      // This is for description capabilities demo purposes.
      this._setDynamicDescription(propsItems);
      this._setDynamicDomDescription();
    }

    combineHostedModel(slotName, hostedSlotId, content) {
      let subId = this._itemSubIdByHostedSlotId.get(hostedSlotId);
      if (!subId) {
        return;
      }

      let hostedItems = this._state.hostedItems || [];
      let listIndex = hostedItems.findIndex(item => item.subId == subId);
      let item = Object.assign({}, content.model, {subId});
      if (listIndex >= 0 && listIndex < items.length) {
        hostedItems[listIndex] = item;
      } else {
        hostedItems.push(item);
      }
      this._updateRenderModel(this._state.propsItems || [], hostedItems);
    }

    _updateRenderModel(propsItems, hostedItems) {
      let models = propsItems.map(item => Object.assign(item, hostedItems.find(hostedItem => hostedItem.subId == item.subId) || {}));
      this._setState({
        propsItems,
        hostedItems,
        renderModel: {
          hasItems: propsItems.length > 0,
          items: {
            $template: 'items',
            models
          }
        }
      });
    }

    combineHostedTemplate(slotName, hostedSlotId, content) {
      if (!this._state.template && !!content.template) {
        let template = TransformationDomParticle.combineTemplates(this.template, content.template);
        this._setState({template});
      }
    }

    _setDynamicDescription(items) {
      if (items.length >= 6) {
        this.setParticleDescription('Show a lot of items ${collection}');
        this.setDescriptionPattern('collection', 'my long list');
      } else if (items.length > 3) {
        this.setParticleDescription('Show a few items: ${collection}');
        this.setDescriptionPattern('collection', 'my short list');
      }
    }

    _setDynamicDomDescription() {
      let template = `
          <span>Show <u><span>{{collection}}</span></u><span hidden="{{actionEmpty}}"> and <i><span style='color:blue'>{{action}}</span></i></span></span>
          `.trim();
      let model = {
        collection: '${collection}',
        action: '${master.action}',
        actionEmpty: '${master.action}._empty_'
      };
      this.setParticleDescription({template, model});
    }
  };
});
