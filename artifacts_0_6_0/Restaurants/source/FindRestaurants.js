// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

defineParticle(({DomParticle}) => {

  const service = `https://xenonjs.com/services/http/php`;
  const placesService =`${service}/places.php`;
  const photoService = `${service}/place-photo.php`;

  const makePlacesUrl = ({loc, radius, type}) => `${placesService}?location=${loc}&radius=${radius}&type=${type}`;

  return class extends DomParticle {
    willReceiveProps({location, restaurants}, {count}) {
      if (!count && restaurants && location) {
        this.fetchPlaces(location);
      }
    }
    async fetchPlaces(location) {
      this._setState({count: -1});
      const placesUrl = makePlacesUrl({
        loc: `${location.latitude},${location.longitude}`,
        radius: `1000`,
        type: `restaurant`
      });
      const response = await fetch(placesUrl);
      const places = await response.json();
      this.receivePlaces(places);
    }
    async receivePlaces(places) {
      const results = places.results || [];
      const restaurants = results.map(p => this.placeToEntity(p));
      await this.clearHandle('restaurants');
      this.appendRawDataToHandle('restaurants', restaurants);
      this.setState({count: results.length});
    }
    placeToEntity(p) {
      const photo = p.photos && p.photos.length ?
        `${photoService}?maxwidth=400&photoreference=${p.photos[0].photo_reference}`
        : p.icon;
      return {
        id: p.id,
        reference: p.reference,
        name: p.name,
        icon: p.icon,
        address: p.vicinity,
        rating: p.rating,
        identifier: p.place_id,
        photo
      };
    }
  };
});
