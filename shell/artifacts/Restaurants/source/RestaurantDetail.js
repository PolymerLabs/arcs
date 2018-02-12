// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

"use strict";

defineParticle(({DomParticle}) => {

  let host = `restaurant-detail`;

  let styles = `
<style>
  [${host}] star {
    display: inline-block;
    width: 14px;
    height: 1em;
    vertical-align: middle;
    background-repeat: no-repeat;
    background-size: 14px 13px;
    background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABwAAAAaCAQAAAAOXfQCAAABCUlEQVR4AZ3LLUhDURyG8f8QhIEKLqhFBLEYTGoSlrQpzDbEJFosqzZNgslgWNIlEQTLwCQ2iwwGA4NtCKIwEEHDEC73kRMO93o9Hzv397YXHrGjzILkwQkH+cInHiQcM0BEKTzcR9kKD29RLkOzIn2UD4bCwnW0lbCwjnYcFr6gdcSGKi3af9YhrZ3ZIxs6LdNlUM8sS4JRLvCLOaMoWVTo4fLKmpgxQRObK8bFhT3+i6iKD0uYzPnDI0xq/rCFyZ0vmyLG5IcRd7hDossbiU13eIPWYIwS12jnrmyYL5QeFf2xzSfKOwV7uIrSZFJSmOYeZdEenvLNruEvUKPPoT1sMCsWzFOXlF/KUOr5gGt3VgAAAABJRU5ErkJggg==);
  }
  [${host}] star[hollow] {
    background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABwAAAAaCAQAAAAOXfQCAAAA/0lEQVR4AZ3SW0sCQRjG8Skzkw5EGAWCCApJeBFFQSEtSGEURGoElnaw3fn+3+AfDDE7G3No9n2u3neen96scA+H7IkywwUn5eAzj2XYFpKUWjw8RiLpxsM7BYexrMJSwXdW4mAL+ZuDODjQ8DwOvmo4dZc6jJkUMkUamfzJE63845oh/5kX9s1/rZIQRhlXVDTSuM3Cy95oCvuwwcjJhqwL39CzoJSOCA0NpCU7YXhmhf0wHFvhfYjVyazwmzU/PDLKM+bG1vbDW11MqFLjRu/XPrbKpyot8t+ny4e6zX2wqSoj6oXrJg/q3nDDS77oWV/6LDl1w4Rt59suA3P/AYHdZDfGturmAAAAAElFTkSuQmCC);
  }
  [${host}] [content] {
    background-color: #4285F4;
    color: white;
    padding: 16px;
    line-height: 1.7em;
  }
  [${host}] [banner] {
    height: 300px;
    background-size: cover;
    background-position: center center;
  }
</style>
  `;

  let template = `
${styles}
<div ${host}>
  <div banner style%="{{style}}"></div>
  <div content>
    <div style="font-size: 1.2em;">{{name}}</div>
    <div>
      <span>{{rating}}</span>
      &nbsp;<star></star><star></star><star></star><star></star><star hollow></star>
      · <span>{{reviews}}</span> reviews
    </div>
    <div style="font-size: 0.8em;">{{kind}}</div>
    <div style="font-size: 0.9em;" unsafe-html="{{addr}}"></div>
  </div>
  <div slotid="action"></div>
</div>
    `.trim();

  let services = `https://xenonjs.com/services/http/php`;
  let detailsService =`${services}/place-details.php`;

  return class extends DomParticle {
    get template() {
      return template;
    }
    _willReceiveProps(props) {
      let {selected} = props;
      if (selected) {
        let item = selected;
        if (item && item.id) {
          this._fetchDetail(item.reference);
        }
        this._setState({item});
      }
    }
    _fetchDetail(reference) {
      fetch(`${detailsService}?reference=${reference}`)
        .then(response => response.json())
        .then(json => this._receiveDetail(json.result))
        ;
    }
    _receiveDetail(detail) {
      //console.log(detail);
      this._setState({detail});
    }
    _shouldRender(props, state) {
      return Boolean(state.item);
    }
    _render(props, state) {
      let model = {
        style: {
          backgroundImage: `url(${state.item.photo})`
        },
        name: state.item.name,
        rating: '',
        reviews: ''
      };
      let detail;
      if (state.detail) {
        detail = {
          rating: state.detail.rating,
          reviews: state.detail.reviews.length,
          kind: state.detail.types.slice(0,3).join(' - ').replace(/_/g, ' '),
          addr: state.detail.adr_address
        };
      }
      return Object.assign(model, detail);
    }
  };

});
