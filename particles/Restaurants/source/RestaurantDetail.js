// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

defineParticle(({DomParticle, html}) => {

  const template = html`
<style>
  :host {
    position: relative;
    font-family: 'Google Sans', sans-serif;
    display: flex;
    flex-direction: column;
    width: 100%;
  }
  [content] {
    position: relative;
    top: 168px;
    padding: 0 16px 32px 16px;
  }
  [name] {
    font-size: 28px;
    font-weight: medium;
    line-height: 36px;
    color: white;
    display: flex;
    width: 80%;
    height: 108px;
    align-items: flex-end;
    margin-bottom: 12px;
  }
  [banner] {
    height: 288px;
    background-size: cover;
    position: absolute;
    left: 0;
    top: 0;
    right: 0;
    background-position: center center;
  }
  [scrim] {
    position: absolute;
    top: 60%;
    right: 0;
    bottom: 0;
    left: 0;
    background: rgba(0, 0, 0, 0) linear-gradient(to bottom, rgba(0, 0, 0, 0) 0px, rgba(0, 0, 0, 0.4) 100%) repeat 0 0;
  }
  [scrimTop] {
    position: absolute;
    top: 0;
    right: 0;
    height: 80px;
    left: 0;
    background: rgba(255, 255,255, 0) linear-gradient(to bottom, rgba(255,255, 255, 0.4) 0px, rgba(255, 255, 255, 0) 100%) repeat 0 0;
  }
  .close-button {
    padding: 16px;
    position: absolute;
    top: 0;
    right: 0;
    z-index: 10;
  }
  [rating] {
    font-size: 56px;
    line-height: 56px;
    letter-spacing: 2px;
    text-align: center;
    margin-bottom: 2px;
    width: 100%;
  }
  [stars-container] {
    display: inline-block;
    width: 82px;
    height: 18px;
    background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAKQAAAAkCAYAAAAHBZGZAAAAAXNSR0IArs4c6QAAA0xJREFUeAHtmdtqFEEQhrtneqMrHogkYA4eIRGE3OTKS/UdfBhRcASD+hy58yE8kBtRyE0gF4kghkQ8XAQ0ZpPs9JRbMePWZnudKTsToacWhq2p/rv+5cvPzmZGKXkJASEgBISAEBACQkAICAEhIATqTgCeXT+Dx//iIP7h8DdHEaLd1tbYwZwfRzGPO0P8w+Efcf/4Lj1YO4aHa+04euIfDn/vQEIyfqqh4SweWB9HAKmH+IfF3zuQKo2734y0pqmpsqaetK7Sk86mnrSmmipr6knrKj3pbOpJa6ph1N6BTKF7qaY14zN4Saknrb2GMjZTT1ozRnhJqSetvYYyNlNPWjNG9Ei9AgnJlZM6tsP5RKyxl59X/S7+4fH3CuROCt3L9UH6XL2qgunycvXEvxoCLtauHsfdK5AG2n2BdPU4H4ijdXm5epyZHK3Ly9XjzORoXV6uHmcmR+vycvU4M/UgMSQTkzazM0rBkdyr7ProNI7iJZ1srHd7/ZX415P/wEBiRPCWStpWs/R3Yn90ynfAxpumoRZ18mm7zC7xrx//vwYSQwMAWj2anLJpOq0iVah3Bi1TEBuzoh6ur2qtwakZ0BT/evEvHTB4cmk4bdlZrVLWzW9QZts040V9b21zQOZKtcW/HvxLBxJTAy9vmfaLlZlI28kyKcogXm/cmV7St1+lZfRFGvEPnz8rkHlg9u5P3IzidDQ/d71n1nwbmtt441rz7Yl/uPzZt33g+d040/Z8UahQg9oiHXdd/MPmzw7kz+V3oyaCwqChBrXcwBXpxT9s/uxADtm9vpvhoOIdPA6HyaU9rOGeu2aKfzj8WYGEJIkynV2gIcqs/mKi4dd4YN2z1tHiHtrzqcU/fP7MpzDzI+bPkxudtbMTy825jx+U+pzn7G3rweWrjWj3Rud/8ui3dn6ks/g1F/i9i3/o/FnfXm27s3+57txb3Iqj0wvNxxjG3hf2cA01uJLv6VX921k+S/zD5V86kPjERHcuwRmYNRNNLejk/fdBscI11KAW9+w/bRkkLtkX/3rz74sJPL12DpKL430LBQ3cg3sLZIXL4l9v/oUBEYEQEAJCQAgIASEgBISAEBACQkAICAEhIASEgBAQAkKgJIFfs5ALEOK9FakAAAAASUVORK5CYII=);
    background-size: cover;
  }
  [stars] {
    height: 100%;
    background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAKQAAAAkCAYAAAAHBZGZAAAAAXNSR0IArs4c6QAAA1pJREFUeAHtmr1rFFEUxd9bZ2MQIuncmMLPxkYJCkoEBQu1it+V+Qu0tcsqW2Q7K8GAWAmxsbMzf4BgbZPKL0hMBCsFiclkr+8mbHJ38nb2vXm7CG+OMHrnzrn3yI/Dm+wSpfAHBEAABEAABEAABEAABEAABMpOgOpjp/j6XxzgHw//Sj9ClJK6w1c/dhXZAf94+PclkKTpNl9FwtSPGfjHw1+HBoLqh45tkPrMe6paHdezP76E7vSZh39c/INPyFTpnZNR1j6hCtFKT1mH7PSZlZ6y9tkRopWesg7Z6TMrPWXts0NqgwOplHxVy1raDLKWnrIepKfcLT1lLTWDrKWnrAfpKXdLT1lLjXsd9Mqm5pGx9M/aMim1tcf8RcmB4XE9823F/b9QXAn/+PgHnZAba39vtcPIseKae8Uj5jcJ//j4BwVSW77qsfX8YuautnnZeu4b/ZQ2L1vPb6u72uZl67lv9FPavGw9n61dX9npzNh90q05InXQZ2Evrdbql6bKg6S58jpPC/9y8u8aSA4LNWpH05TmTSgv5oXH9ZkJ4/sk0dO6sfrVZQb+5eOf+8rm4CSnL13WWj8xYUpdQmTT8Czv2NrlGEbeA//y8c89IWW41hvjF1SazptPLidkv2et1SeVJNNDjeUPPbU5AviXg3/uCSnzwYGqjoxOKK1fyX5ubbQ8ExpG9oB/Ofg7n5AyeBsztXek6JrsZWut9EK1uXo92+/HPfzj5e98QraDRM9O7jcfdybb993/pcltbXdFkSfwj5u/dyA3f/6+ar4AH+kVJtawtpfO9zn84+bvHchWS9/Nhsh8gl7iK9u3abMa33vbTvjHw98rkPTirPkNM5qSITI/hL5NkuQMX1x3PqMpnpG9kBr+8fNPfAKSLn+/Yr4kH+UZcyqtmdfyo+rs6nOx4+Z6vfbQBPMpEQ2zlmfM8wWhKVzCP37+fifkZmv7da31ojkRzw91hnEraNzjZyaxi9yg9kzhGO4O7uyCf7T8nQNJb+7tM1/l3DC/aPaymlTO6cbSx92odFb8jDWs5Rme7VT438G/3Pz3JIYeH55I67U9H2j2CDMNnuHZTNv7Fv7l5u8dGAyAAAiAAAiAAAiAAAiAAAiAAAiAAAiAAAiAAAiAQBcC/wC+8IYWjlmcxQAAAABJRU5ErkJggg==);
    background-size: cover;
    background-repeat: repeat no-repeat;
  }
  [row] {
    display: flex;
    flex-direction: row;
  }
  [row0] {
    margin-top: 22px;
  }
  [row1] {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    width: 82px;
    margin-top: 16px;
    padding-bottom: 4px;
  }
  [flex] {
    flex: 1;
  }
  [detail-caption] {
    font-size: 14px;
    font-weight: 500;
    line-height: 14px;
    letter-spacing: .25px;
    opacity: .54;
    margin-bottom: 8px;
  }
  [detail-content] {
    font-size: 18px;
    line-height: 24px;
    margin-bottom: 18px;
  }
  [control-panel] {
    box-shadow: 0 0 8px 0px rgba(0,0,0,.15);
    border-radius: 8px;
  }
</style>

<div banner xen:style="{{style}}">
  <div scrim></div>
  <div scrimTop></div>
</div>

<div content>
  <div name>{{name}}</div>
  <div row>
    <div flex row0>
      <div detail-caption>Address</div>
      <div detail-content unsafe-html="{{addr}}"></div>
      <div detail-caption>Phone</div>
      <div detail-content>{{phone}}</div>
      <div detail-caption>Website</div>
      <div detail-content><a href="{{link}}" target="_blank">{{website}}</a></div>
      <div detail-caption>Reviews</div>
      <div reviews unsafe-html="{{reviews}}"></div>
    </div>
    <div row1>
      <div rating>{{rating}}</div>
      <div stars-container>
        <div stars xen:style="{{starStyle}}"></div>
      </div>
    </div>
  </div>

  <div control-panel slotid="action"></div>
</div>
    `;

  const services = `https://xenonjs.com/services/http/php`;
  const detailsService =`${services}/place-details.php`;

  return class extends DomParticle {
    get template() {
      return template;
    }
    willReceiveProps({restaurant}) {
      if (restaurant) {
        if (restaurant && restaurant.id) {
          this._fetchDetail(restaurant.reference);
        }
        this._setState({restaurant});
      }
    }
    _fetchDetail(reference) {
      fetch(`${detailsService}?reference=${reference}`)
        .then(response => response.json())
        .then(json => this._receiveDetail(json.result))
        ;
    }
    _receiveDetail(detail) {
      // console.log(detail);
      this._setState({detail});
    }
    shouldRender(props, state) {
      return Boolean(state.restaurant);
    }
    render(props, {restaurant, detail}) {
      const model = {
        style: {
          backgroundImage: `url(${restaurant.photo})`
        },
        name: restaurant.name,
        rating: '',
        reviews: ''
      };
      if (detail) {
        const reviews = (detail.reviews ? detail.reviews.map(review => this.reviewToHtml(review)) : []).join('<br><br>');
        const url =
            detail.website &&
            detail.website.replace(/^(?:https?:\/\/)?(?:www\.)?/i, '').split('/')[0];
        Object.assign(model, {
          rating: detail.rating,
          starStyle: `width: ${Math.round( (detail.rating || 0) / 5 * 100)}%`,
          reviews,
          kind: detail.types ? detail.types.slice(0, 3).join(' - ').replace(/_/g, ' ') : '',
          addr: detail.vicinity,
          website: url || 'n/a',
          link: url ? `http://${url}` : '',
          phone: detail.formatted_phone_number || 'n/a',
        });
      }
      return model;
    }
    reviewToHtml(review) {
      const photo = review.profile_photo_url || '';
      const html = `<img style="width: 56px; margin: 8px 8px 8px 0; vertical-align: middle;" src="${photo}"> ${review.relative_time_description}<br>${review.text}`;
      return html;
    }
  };

});
