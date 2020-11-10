/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

defineParticle(({UiParticle, resolver}) => {

  const host = `find-restaurants`;

  const template = `
<div ${host}>
  <div hidden="{{complete}}" style="position:absolute;left:50%;top:50%;-webkit-transform: translate3d(-50%,-50%,0);">Finding restaurants...</div>
  <div slotid="masterdetail"></div>
</div>

  `.trim();

  const service = `https://xenonjs.com/services/http/php`;
  const placesService =`${service}/places.php`;
  const photoService = `${service}/place-photo.php`;

  return class extends UiParticle {
    get template() {
      return template;
    }
    willReceiveProps(props, state) {
      if (props.restaurants && props.location && !state.count) {
        this._fetchPlaces(props.location);
      }
    }
    _fetchPlaces(location) {
      this._setState({count: -1});
      const loc = `${location.latitude},${location.longitude}`;
      const radius = `1000`;
      const type = `restaurant`;
      fetch(`${placesService}?location=${loc}&radius=${radius}&type=${type}`)
        .then(response => response.json())
        .then(places => this._receivePlaces(places));
    }
    async _receivePlaces(places) {
      const restaurants = places.results.map(p => {
        const photo = p.photos && p.photos.length
          ? `${photoService}?maxwidth=400&photoreference=${p.photos[0].photo_reference}`
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
      });
      await this.clearHandle('restaurants');
      this.appendRawDataToHandle('restaurants', restaurants);
      this._setState({count: places.results.length});
    }
    render(props, state) {
      return {
        complete: state.count > 0
      };
    }
  };
});
