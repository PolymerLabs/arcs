// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

"use strict";

/* global defineParticle */

defineParticle(({DomParticle, html}) => {

  let host = `show-schedule`;

  const template = html`
    <div ${host}>{{week}</div>
  `;

  const dayTemplate = html`
    <div day>
      <div>{{day}}</div>
      <div>{{tiles}}</div>
    </div>
  `;

  const tileTemplate = html`
    <div tile trigger$="{{trigger}}" style%="{{image}}" style="width: 100%; padding-bottom: 140%; background-repeat: no-repeat; background-size: contain;"></div>
  `;

  return class extends DomParticle {
    get template() {
      return template;
    }
    // TODO(sjmiles): bad things happen if shouldRender is enabled, run this by @mmandlis
    //shouldRender({show}) {
    //  return Boolean(show);
    //}
    render({shows}) {
      return {
        week: this.renderWeek(shows)
      };
    }
    renderWeek(shows) {
      const days = [`Sunday`, `Monday`, `Tuesday`, `Wedsday`, `Thursday`, `Friday`, `Saturday`];
      const models = days.map(day => {
        return {
          day,
          $template: dayTemplate
        };
      });
      return models;
    }
  };
});
