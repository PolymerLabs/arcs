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
  [container] {
    display: block;
    height: 300px;
    border: 3px solid blue;
    box-sizing: border-box;
    overflow-y: scroll;
  }
</style>

<div>
  <button on-click="onGo">Go</button>
  <button on-click="onStop">Stop</button>
</div>

<br>

<scroll-box container scrollTop="{{scrollTop:scrollTop}}">{{entries}}</scroll-box>

<br>

<scroll-box container>{{entries}}</scroll-box>

<template entry>
  <div>Entry <span>{{id}}</span></div>
</template>

  `;

  return class extends SimpleParticle {
    get template() {
      return template;
    }
    update(props, {count, scrollTick, stop}) {
      this.updateScroll(scrollTick);
      // simulate new data coming in
      if (!stop) {
        setTimeout(() => this.setState({scrollTick: false, count: count < 200 ? count+1 : 100}), 1000);
      }
    }
    updateScroll(scrollTick) {
      const toggleTick = () => this.setState({scrollTick: !scrollTick});
      // if we updated for a reason other than updating the scroll-position, update again
      // after a tick so we can affect scrollTop
      if (!scrollTick) {
        // calling setState from inside a update/render pass doesn't cause a re-render,
        // setTimeout so setState WILL trigger re-render
        setTimeout(toggleTick, 0);
      } else {
        // calling setState from inside a update/render pass doesn't cause a re-render,
        // which is what we want because we are only rendering to update scrollTop
        toggleTick();
      }
    }
    render(props, {count}) {
      const models = [];
      for (let id=0; id<count; id++) {
        models.push({id});
      }
      return {
        scrollTop: 9999,
        entries: {
          $template: 'entry',
          models: models
        }
      };
    }
    onGo() {
      this.setState({stop: false});
    }
    onStop() {
      this.setState({stop: true});
    }
  };

});
