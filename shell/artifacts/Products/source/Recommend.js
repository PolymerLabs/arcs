// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

"use strict";

defineParticle(({Particle}) => {
  return class Recommend extends Particle {
    setViews(views) {
      this.on(views, 'population', 'change', e => {
        var populationView = views.get("population");
        populationView.toList().then(data => {
          for (let i = 0; i < 3 && i < data.length; i++) {
            views.get('recommendations').store(data[i]);
          }
          this.relevance = 9;
        });
      });
    }
  }
});
