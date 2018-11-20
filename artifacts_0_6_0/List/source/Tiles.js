// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

defineParticle(({DomParticle, html, log}) => {

  const host = `tile-list`;

  const template = html`
<style>
  [${host}] {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    padding: 8px 0;
  }
  [card] {
    margin: 8px;
    width: calc(100% - 24px);
    border: 3px solid transparent;
  }
  [card][selected] {
    border: 3px solid #0068a7;
  }
  @media (min-width: 540px) {
    [card] {
      width: calc(50% - 24px);
    }
  }
  @media (min-width: 800px) {
    [card] {
      width: calc(33% - 24px);
    }
  }
  @media (min-width: 1400px) {
    [card] {
      width: calc(25% - 24px);
    }
  }
  @media (min-width: 1800px) {
    [card] {
      width: calc(20% - 24px);
    }
  }
  @media (min-width: 2200px) {
    [card] {
      width: calc(10% - 24px);
    }
  }
</style>

<div slotid="action"></div>
<div ${host}>{{items}}</div>

<template tiled-items>
  <div card selected$="{{selected}}">
    <div slotid="tile" subid$="{{id}}" key="{{id}}" on-click="_onSelect"></div>
    <div slotid="annotation" subid$="{{id}}"></div>
  </div>
</template>
    `;

  return class extends DomParticle {
    get template() {
      return template;
    }
    shouldRender({list}) {
      return Boolean(list);
    }
    update({list, selected}) {
      // if (selected && selected.delete) {
      //   this.handles.get('selected').clear();
      //   log('request to delete', selected);
      //   const item = list.find(item => item.id === selected.id);
      //   if (item) {
      //     this.handles.get('list').remove(item);
      //     //log('new list', await this.handles.get('list').toList());
      //   }
      // }
    }
    render({list, selected}) {
      const selectedId = selected && selected.id;
      //log(`selected: ${selectedId}`);
      const sorted = list.sort((a, b) => a.name > b.name ? 1 : a.name === b.name ? 0 : -1);
      return {
        items: {
          $template: 'tiled-items',
          models: sorted.map(item => {
            log(`rendering: ${item.id}`);
            return {
              id: item.id,
              selected: selectedId === item.id
            };
          })
        }
      };
    }
    _onSelect(e) {
      const item = this._props.list.find(i => i.id === e.data.key);
      this.handles.get('selected').set(item);
    }
  };
});
