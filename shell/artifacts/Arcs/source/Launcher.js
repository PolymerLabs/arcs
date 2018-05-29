// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

'use strict';

defineParticle(({DomParticle, log, html}) => {

  const host = 'arcs-list';

  const style = html`

<style>
  [${host}] {
  }
  [${host}] cx-tabs {
    border-bottom: 1px solid #ccc;
    justify-content: center;
  }
  [${host}] cx-tab {
    font-weight: 500;
    font-size: 14px;
    letter-spacing: .25px;
    color: #999;
  }
  [${host}] cx-tab[selected] {
    color: #111;
  }
  [${host}] [columns] {
    display: flex;
    padding: 16px;
    /* temporary: pending responsiveness */
    max-width: 600px;
    margin: 0 auto;
  }
  [${host}] [chip] {
    font-family: 'Google Sans';
    position: relative;
    display: flex;
    flex-direction: column;
    padding: 16px 16px 16px 16px;
    margin: 0 4px 8px 4px;
    font-size: 18px;
    color: whitesmoke;
    border-radius: 8px;
  }
  [${host}] a {
    display: block;
    color: inherit;
    text-decoration: none;
  }
  [${host}] [hovering] {
    position: absolute;
    right: 16px;
    bottom: 16px;
    visibility: hidden;
    height: 24px;
  }
  [${host}] [chip]:hover [hovering] {
    visibility: visible;
  }
  [${host}] [delete][hide] {
    display: none;
  }
  [${host}] [share] {
    display: flex;
    align-items: center;
    margin-top: 32px;
  }
  [${host}] [share] icon:not([show]) {
    display: none;
  }
</style>

`;

  let template = html`

${style}

<div ${host}>
  <cx-tabs on-select="_onTabSelect">
    <cx-tab>All</cx-tab>
    <cx-tab selected>Recent</cx-tab>
    <cx-tab>Starred</cx-tab>
    <cx-tab>Shared</cx-tab>
  </cx-tabs>
  <div columns>
    <div style="flex: 1;">{{columnA}}</div>
    <div style="flex: 1;">{{columnB}}</div>
  </div>
</div>

<template column>
  <div chip style="{{chipStyle}}">
    <div hovering>
      <span style="flex: 1;"></span>
      <icon delete hide$="{{noDelete}}" key="{{arcId}}" on-click="_onDelete" style="margin-right:8px;">delete_forever</icon>
      <icon star show key="{{arcId}}" on-click="_onStar">{{starred}}</icon>
    </div>
    <a href="{{href}}" trigger$="{{description}}">
      <div description title="{{description}}" unsafe-html="{{blurb}}"></div>
      <div style="flex: 1;"></div>
    </a>
    <div share>
      <icon show$="{{self}}">account_circle</icon>
      <icon show$="{{friends}}">people</icon>

    </div>
  </div>
</template>
`;

  return class extends DomParticle {
    get template() {
      return template;
    }
    getInitialState() {
      return {
        selected: 1
      };
    }
    willReceiveProps({arcs}) {
      const collation = this._collateItems(arcs);
      this._setState(collation);
    }
    shouldRender(props, state) {
      return Boolean(state.items);
    }
    render(props, {items, shared, starred, recent, selected}) {
      const columns = [[], []];
      const chosen = [items, recent, starred, shared][selected || 0];
      chosen.sort((a, b) => a.key > b.key ? 1 : a.key < b.key ? -1 : 0);
      log(chosen);
      chosen.forEach((item, i) => {
        columns[i % 2].push(item);
      });
      return {
        columnA: {
          $template: 'column',
          models: columns[0],
        },
        columnB: {
          $template: 'column',
          models: columns[1],
        }
      };
    }
    _collateItems(arcs) {
      const result = {
        items: [],
        shared: [],
        starred: [],
        recent: [],
      };
      let firstTouch = Infinity;
      arcs.forEach((a, i) => {
        if (!a.deleted) {
          let model = this._renderArc(a);
          result.items.push(model);
          if (a.starred) {
            result.starred.push(model);
          }
          if (a.share > 1) {
            result.shared.push(model);
          }
          if (a.touched) {
            firstTouch = Math.min(firstTouch, a.touched);
          }
        }
      });
      // times in ms
      const hours = 60 * 60 * 1000;
      const recent = 1 * hours;
      arcs.forEach((a, i) => {
        if (!a.deleted) {
          if (a.touched && a.touched - firstTouch < recent) {
            result.recent.push(this._renderArc(a));
          }
        }
      });
      return result;
    }
    _renderArc(arc) {
      // massage the description
      //const blurb = arc.description.length > 70 ? arc.description.slice(0, 70) + '...' : arc.description;
      const blurb = arc.description;
      const chipStyle = {
        backgroundColor: arc.bg || arc.color || 'gray',
        color: arc.bg ? arc.color : 'white',
      };
      // populate a render model
      return {
        arcId: arc.id,
        key: arc.key,
        // Don't allow deleting the 'New Arc' arc.
        noDelete: arc.key === '*',
        href: arc.href,
        blurb,
        description: arc.description,
        icon: arc.icon,
        starred: arc.starred ? 'star' : 'star_border',
        chipStyle,
        self: Boolean(arc.share >= 2),
        friends: Boolean(arc.share >= 3)
      };
    }
    _onTabSelect(e) {
      const selected = e.data.value;
      this._setState({selected});
    }
    _onDelete(e) {
      const arcId = e.data.key;
      const arc = this._props.arcs.find(a => a.id === arcId);
      if (!arc) {
        log(`Couldn't find arc to delete [arcId=${arcId}].`);
      } else {
        const arcs = this.handles.get('arcs');
        arcs.remove(arc);
        arc.deleted = true;
        arcs.store(arc);
        log(`Marking arc [${arc.key}] for deletion.`);
      }
    }
    _onStar(e) {
      const arcId = e.data.key;
      const arc = this._props.arcs.find(a => a.id === arcId);
      if (!arc) {
        log(`Couldn't find arc to star [arcId=${arcId}].`);
      } else {
        const arcs = this.handles.get('arcs');
        arc.starred = !arc.starred;
        arcs.remove(arc);
        arcs.store(arc);
        log(`Toggled "starred" for arc [${arc.key}].`, arc);
      }
    }
    setHandle(name, data) {
      const handle = this.handles.get(name);
      handle.set(new (handle.entityClass)(data));
    }
  };
});
