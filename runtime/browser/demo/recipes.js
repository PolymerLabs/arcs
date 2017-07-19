/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

let recipes = [
{
  name: "Create shortlist with [product, ...]",
  particles: [{
    name: "Create",
    constrain: {
      "newList": "list"
    }
  },{
    name: "SaveList",
    constrain: {
      "list": "list"
    }
  },{
    name: "ShowProducts",
    constrain: {
      "list": "list"
    }
  }]
}, 

{
  name: "See [person]'s wishlist",
  particles: [{
    name: "WishlistFor",
    constrain: {
      "wishlist": "wishlist",
      "person": "person"
    }
  },{
    name: "Choose",
    constrain: {
      "singleton": "person"
    }
  },{
    name: "ShowProducts",
    constrain: {
      "list": "wishlist"
    }
  }]
},

{
  name: "Create shortlist with [product, ...] and suggest similar products from [person]'s wish list",
  particles: [{
    name: "Create",
    constrain: {
      "newList": "list"
    }
  },{
    name: "Create",
    constrain: {
      "newList": "recommended"
    }
  },{
    name: "WishlistFor",
    constrain: {
      "wishlist": "wishlist",
      "person": "person"
    }
  },{
    name: "Recommend",
    constrain: {
      "known": "list",
      "population": "wishlist",
      "recommendations": "recommended"
    }
  },{
    name: "SaveList",
    constrain: {
      "list": "list"
    }
  },{
    name: "Choose",
    constrain: {
      "singleton": "person"
    }
  },{
    name: "ShowProducts",
    constrain: {
      "list": "list"
    }
  },{
    name: "Chooser",
    constrain: {
      "choices": "recommended",
      "resultList": "list"
    }
  }, {
    name: "AlsoOn",
    constrain: {
      "list": "list",
      "choices": "wishlist"
    }
  }]
}, 

{
  name: "Buying for [person]'s [occasion] in [timeframe]? Product [X] arrives too late.",
  particles: [{
    name: "GiftList",
    constrain: {
      "person": "person"
    }
  }, {
    name: "Arrivinator",
    constrain: {
      "list": "list"
    }
  }]
}, 

{
  name: "Check manufacturer information for products.",
  particles: [{
    name: "ManufacturerInfo",
    constrain: {
      "list": "list"
    }
  }]
}, 

/*{
  name: "Check for newer versions, e.g. there is a new version of [product].",
  particles: []
}, {
  name: "[Manufacturer] recommends [product] instead of [product] for 13 year olds.",
  particles: []
}, {
  name: "See awards, e.g. [product] winning the [award].",
  particles: []
},*/ 

{
  name: "Recommendations based on Claire's interest in field hockey.",
  particles: [{
    name: "Interests",
    constrain: {
      "list": "wishlist"
    }
  }]
}, 

{
  name: "Profit",
  particles: []
}
];

module.exports = recipes;