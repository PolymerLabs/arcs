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
        this.logDebug("known", views.get("known"));
        var populationView = views.get("population");
        this.logDebug("population", populationView);
        populationView.toList().then(data => {
          views.get('recommendations').store(data[0]);
          views.get('recommendations').store(data[1]);
          views.get('recommendations').store(data[2]);
          this.logDebug("recommendations", views.get('recommendations'));
          this.relevance = 9;
        });
      });
    }
  }
});
