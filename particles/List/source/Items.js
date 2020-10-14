/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

/* global defineParticle */

defineParticle(({UiParticle, html, log}) => {

  const template = html`
<style>
  :host {
    padding: 8px;
    max-width: 500px;
    margin: 0 auto;
  }
  [items] {
    background-color: white;
  }
  /* note: avoid padding/margin/etc on [item] so the children can use the full bleed */
  /* TODO(sjmiles): provide css-variables for customizing selection */
  [items] > [item][selected] {
    background-color: whitesmoke;
  }
  div[slotid="annotation"] {
    font-size: 0.75em;
  }
  [items] p {
    margin: 0;
  }
  [empty] {
    color: #aaaaaa;
    font-size: 14px;
    font-style: italic;
    padding: 10px 0;
  }
</style>

<div slotid="preamble"></div>
<div empty hidden="{{hasItems}}">List is empty</div>
<div items>{{items}}</div>
<div slotid="action"></div>
<div slotid="postamble"></div>

<template items>
  <div item selected$="{{selected}}">
    <div slotid$="{{item_slot}}" subid$="{{id}}" key="{{id}}" on-click="onSelect"></div>
    <div slotid$="{{annotation_slot}}" subid$="{{id}}"></div>
  </div>
</template>

  `;

  return class extends UiParticle {
    get template() {
      return template;
    }
    shouldRender({list}) {
      return Boolean(list);
    }
    render({list, selected}) {
      const selectedId = selected && (selected.id || this.idFor(selected));
      //const sorted = list.sort((a, b) => a.name > b.name ? 1 : a.name === b.name ? 0 : -1);
      const filtered = list;
      const models = filtered.map(item => this.renderItem(item, selectedId === this.idFor(item)));
      return {
        hasItems: models.length > 0,
        items: {
          $template: 'items',
          models
        }
      };
    }
    renderItem(entity, selected) {
      return {
        id: this.idFor(entity),
        selected
      };
    }
    onSelect(e) {
      const item = this.props.list.find(i => this.idFor(i) === e.data.key);
      this.handles.get('selected').set(item);
    }
  };

});
