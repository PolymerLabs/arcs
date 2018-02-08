// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

'use strict';

defineParticle(({TransformationDomParticle, resolver}) => {

  let host = `[show-collection]`;

  let styles = `
  <style>
  ${host} {
    padding: 16px;
    background-color: white;
  }
  ${host} > [head] {
    display: flex;
    align-items: center;
    padding: 8px 0;
    color: #aaaaaa;
    font-weight: bold;
  }
  ${host} > x-list [item] {
    padding: 4px 8px;
    background-color: white;
    border-bottom: 1px solid #eeeeee;
  }
  ${host} > x-list [item]:last-child {
    border: none;
  }
  ${host} div[slotid="annotation"] {
    font-size: 0.7em;
  }
  ${host} [empty] {
    color: #aaaaaa;
    font-size: 14px;
    font-style: italic;
    padding: 10px 0;
  }
  </style>
  `;

  let template = `
  ${styles}
<div show-collection>
  <div head>
    <span>Your shortlist</span>
  </div>

  <div slotid="preamble"></div>

  <div empty hidden="{{hasItems}}">List is empty</div>

  <x-list items="{{items}}">{{hostedParticle}}</template></x-list>

  <div slotid="action"></div>

  <div slotid="postamble"></div>
</div>
    `.trim();

  return class extends TransformationDomParticle {
    get template() { return template; }
    async setViews(views) {
      this._views = views;
      this._template = null;
      let arc = await this.constructInnerArc();

      this.on(views, 'collection', 'change', async (e) => {
        let handleIds = new Set(this._state.renderModel && this._state.renderModel.items ? this._state.renderModel.items.map(item => item.subId) : []);

        let collectionView = views.get('collection');
        let collection = await collectionView.toList();

        if (collection.length > 0) {
          this.relevance = 0.1;
        }

        let hostedParticle = await views.get('hostedParticle').get();
        for (let [index, item] of collection.entries()) {
          if (handleIds.has(item.id)) {
            continue;
          }
          let itemView = await arc.createHandle(collectionView.type.primitiveType(), 'item' + index);

          let hostedSlotName = [...hostedParticle.slots.keys()][0];
          let slotName = [...this.spec.slots.values()][0].name;
          let slotId = await arc.createSlot(this, slotName, hostedParticle.name, hostedSlotName);
          if (!slotId) {
            continue;
          }

          let recipe = `
            import '${hostedParticle.implFile.replace(/\.[^\.]+$/, '.manifest')}'
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
      let items = TransformationDomParticle.propsToItems(props.collection);
      this._setState({
        renderModel: {
          items,
          hasItems: items.length > 0
        }
      });

      // This is for description capabilities demo purposes.
      // this._setDynamicDescription(items);
      this._setDynamicDomDescription(items);
    }

    _setDynamicDomDescription(items) {
      let template = `
          <span>Show <u><span>{{collection}}</span></u><span hidden="{{actionEmpty}}"> and <i><span style='color:blue'>{{action}}</span></i></span></span>
          `.trim();
      let model = {
        collection: '${collection}',
        action: '${root.action}',
        actionEmpty: '${root.action}._empty_'
      };
      this.setParticleDescription({template, model});
    }

    combineHostedTemplate(slotName, hostedSlotId, content) {
      if (!this._state.template && !!content.template) {
        this._setState({template: TransformationDomParticle.combineTemplates(this.template, content.template)});
      }
    }
  };
});
