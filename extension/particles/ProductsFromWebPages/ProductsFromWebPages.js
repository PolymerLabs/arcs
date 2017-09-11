// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

"use strict";

defineParticle(({DomParticle}) => {
  return class ProductsFromWebPages extends DomParticle {

    _shouldRender(props, state) { return false; }

    _willReceiveProps(props) {

      let productsView = this._views.get('products');

      for (let l of props.list) {
        let raw = l['rawData'];

        let url = raw['url'];

        /* Skip sites that we don't know contain Products, or that include
         * schema.org markup as we'll have picked those up already. */
        if (! url.includes('amazon')) {
          continue;
        }

        let product = new productsView.entityClass({
            'image': raw['image'],
            'name': raw['name']
        });

        productsView.store(product);
      }
    }
  }
});
