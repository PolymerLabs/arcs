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
  },{
    name: "GiftList",
    constrain: {
      "person": "person",
      "list": "list",
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
}, {
  name: "Buying for <person>'s <occasion> in <timeframe>? Product <X> arrives too late.",
  particles: [{
    name: "GiftList",
    constrain: {
      "person": "person",
      "list": "list",
      "resultList": "list"
    }
  }]
}, {
  name: "Check for newer versions, e.g. there is a new version of <product>.",
  particles: []
}, {
  name: "<Manufacturer> recommends <product> instead of <product> for 13 year olds.",
  particles: []
}, {
  name: "See awards, e.g. <product> winning the <award>.",
  particles: []
}, {
  name: "Recommendations based on Claire's interest in field hockey.",
  particles: []
}, {
  name: "Profit",
  particles: []
}];