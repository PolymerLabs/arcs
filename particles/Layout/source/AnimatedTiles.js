/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

defineParticle(({SimpleParticle, html, log, resolver}) => {

  const template = html`

<style>
  :host {
    padding: 16px;
  }
  [tile] {
    position: absolute;
    background: #eee;
    color: black;
    transition: all 0.3s;
    width: 120px;
    height: 120px;
    padding: 8px;
    box-sizing: border-box;
    border: 1px dotted gray;
    opacity: 1;
  }
  [container] {
    display: block;
    position: relative;
    height: 400px;
  }
</style>

<h3>Click the tiles to animate...</h3>

<div container on-click="onClick">
  <div>{{tiles}}</div>
</div>

<template tile>
  <span tile xen:style="{{style}}">{{name}}</span>
</template>
  `;

  const Grid = class {
    constructor() {
      this.grid = [];
      this.tiles = [];
    }
    _newTile(name, t, l) {
      const tile = {name, t, l};
      tile.id = this.tiles.push(tile) - 1;
      return tile;
    }
    insert({name, t, l}) {
      const tile = this._newTile(name, t, l);
      const row = this.grid[t] || (this.grid[t] = []);
      row.splice(l, 0, tile);
      for (let i=l+1, col; col=row[i]; i++) {
        col.l++;
      }
    }
    remove({t, l}) {
      const row = this.grid[t];
      for (let i=l, col; (col=row[i]); i++) {
        col.l--;
      }
      const tile = row.splice(l, 1).pop();
      tile.removed = true;
    }
    sweep() {
      for (let i=0, tile; (tile=this.tiles[i]); i++) {
        tile.frozen = true;
        if (tile.removed) {
          this.tiles.splice(i, 1);
          for (let s=i, sibling; (sibling=this.grid[s]); s++) {
            sibling.id--;
          }
          i--;
        }
      }
    }
    unfreeze() {
      this.tiles.forEach(tile => tile.frozen = false);
    }
    operate({insert, remove, sweep, unfreeze}) {
      if (insert) {
        this.insert(insert);
      } else if (remove) {
        this.remove(remove);
      } else if (sweep) {
        this.sweep();
      } else if (unfreeze) {
        this.unfreeze();
      }
    }
  };

  return class extends SimpleParticle {
    get template() {
      return template;
    }
    update(props, {grid, insert, remove, sweep, unfreeze}) {
      if (!grid) {
        grid = new Grid();
        ['Alfa', 'Bravo'].forEach(name => grid.insert({name, t: 0, l: 0}));
        ['Charlie', 'Delta'].forEach(name => grid.insert({name, t: 1, l: 0}));
        this.setState({grid});
      }
      // debounce fires function after 100ms has elapsed since last invocation,
      // notion is that we `sweep` up dead tiles after 1s of idleness since last
      // add/remove operation
      const sweeper = () => this.debounce('sweep', () => this.setState({sweep: true}), 1000);
      grid.operate({insert, remove, sweep, unfreeze});
      if (insert || remove) {
        sweeper();
        this.setState({insert: null, remove: null});
      } else if (sweep) {
        this.setState({sweep: false});
        // transitions are disabled during sweep to avoid bogus animations,
        // unfreeze (re-enable transitions) one tick later
        setTimeout(() => this.setState({unfreeze: true}), 0);
      }
      this.setState({unfreeze: false});
    }
    render(props, {grid}) {
      const models = grid.tiles.map(({name, t, l, removed, frozen}, i) => ({
        key: i,
        name,
        style: `${frozen ? `transition: none;` : ``} ${removed ? `transition-property: opacity; opacity: 0;` : ''} top: ${t*120}px; left: ${l*120}px; z-index: ${1000-i};`
      }));
      return {
        tiles: {$template: 'tile', models},
        models
      };
    }
    async onClick() {
      const {grid} = this.state;
      const live = grid.tiles.filter(tile => !tile.removed);
      switch (live.length) {
        case 4:
          this.setState({insert: {name: 'Echo', t: 0, l: 1}});
          break;
        case 5:
          this.setState({insert: {name: 'Foxtrot', t: 0, l: 0}});
          break;
        case 6: {
          let randomValue = await this.service({call: 'random.next'});
          const t = Math.floor(randomValue * 3);
          const row = grid.grid[t];
          randomValue = await this.service({call: 'random.next'});
          const l = Math.floor(randomValue * (row ? row.length : 0));
          this.setState({insert: {name: `Golf (${t},${l})`, t, l}});
        } break;
        case 7: {
          const randomValue = await this.service({call: 'random.next'});
          const tile = live[Math.floor(randomValue * live.length)];
          this.setState({remove: tile});
        } break;
      }
    }
  };

});
