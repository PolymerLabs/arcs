module.exports = [{
  name: "Create shortlist with <product, ...> and suggest similar products from <person>'s wish list",
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
    name: "ListView",
    constrain: {
      "list": "list"
    }
  },{
    name: "Chooser",
    constrain: {
      "choices": "recommended",
      "resultList": "list"
    }
  }]
}, {
  name: "Create shortlist with <product, ...>",
  particles: []
}, {
  name: "See <person>'s wishlist",
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
    name: "ListView",
    constrain: {
      "list": "wishlist"
    }
  }]
}];
