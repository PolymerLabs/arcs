// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

defineParticle(({DomParticle, html}) => {

  let host = `reservation-form`;

  let styles = html`
<style>
  [${host}] > * {
    vertical-align: middle;
  }
  [${host}] .x-select {
    display: inline-block;
    position: relative;
    border-right: 1px solid rgba(0,0,0,.1);
    height: 100%;

  }
  [${host}] .x-select::after {
    content: '▼';
    display: block;
    position: absolute;
    right: 8px;
    bottom: 2px;
    transform: scaleY(0.4) scaleX(0.8);
    pointer-events: none;
  }
  [${host}] .x-select > select {
    position: relative;
    margin: 0;
    padding: 0;
    border: 0;
    background-color: transparent;
    border-radius: 0;
    font-size: 16px;
    overflow: hidden;
    outline: none;
    -webkit-appearance: none;
    vertical-align: top;
  }
  [${host}] input {
    padding: 0;
    vertical-align: top;
    border: 0;
    background: transparent;
    font-family: 'Google Sans';
    font-size: 16px;
    line-height: 24px;
  }
  [${host}] input::-webkit-clear-button {
    display: none;
  }
  [${host}] [times] {
    display: flex;
    justify-content: space-around
  }
  [${host}] .x-button {
    display: inline-flex;
    align-items: center;
    position: relative;
    padding: 10px 16px;
    border-radius: 3px;
    -webkit-appearance: none;
    background-color: #4285f4;
    color: #fff;
    border: 0;
    outline: none;
  }
  [${host}] .x-button:disabled {
    opacity: 0.3;
  }
  [${host}] [time-picker] > div {
    display:flex;
    flex-direction:row;
    border-bottom: 1px solid rgba(0,0,0,.1);
    height: 56px;
    align-items: center;
  }
</style>
  `;

  let template = html`
${styles}
<div ${host} id={{subId}}>
  <div time-picker>{{timePicker}}</div>
  <div times>{{availableTimes}}</div>
</div>

<template time-picker>
  <div>
    <div class="x-select">
      <select on-change="_onPartySizeChanged">
        <option value="1" selected$={{selected1}}>For 1</option>
        <option value="2" selected$={{selected2}}>For 2</option>
        ${[3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]
          .map(i => `<option value="${i}" selected$={{selected${i}}}>For ${i}</option>`).join('')}
        <option value="21" selected$={{selected21}}>Larger party</option>
      </select>
    </div>
    <input type="datetime-local" value="{{date}}" on-change="_onDateChanged">
  </div>
</template>

<template available-times>
  <button class="x-button raised" disabled$={{notAvailable}}>{{time}}</button>
</template>
    `.trim();

  return class extends DomParticle {
    get template() {
      return template;
    }
    willReceiveProps(props, state) {
      let event;

      if (!props.event || !props.event.startDate) {
        /* Default time selection:
         *  - if later than 10pm, book evening tomorrow
         *  - if earlier than 5pm, book this evening
         *  - round up to next half hour and set seconds to 0
         *
         * (i.e. earliest can be 5:30pm and latest 10pm)
         */
        let when = new Date();

        if (when.getHours() >= 22) {
          when.setDate(when.getDate() + 1);
          when.setHours(19);
          when.setMinutes(0);
        } else if (when.getHours() < 17) {
          when.setHours(19);
          when.setMinutes(0);
        } else {
          when.setMinutes(when.getMinutes() + 15);
          when.setMinutes(when.getMinutes() > 30 ? 60 : 30);
        }
        when.setSeconds(0);
        when.setMilliseconds(0);

        const whenString = this.toDateInputValue(when);
        event = {startDate: whenString, endDate: whenString, participants: 2};
      } else {
        event = Object.assign({}, props.event.rawData);
      }
      this._setState({currentEvent: event});

      this.setParticleDescription(
        props.selected
          ? this.createDescription(props.selected.id, event.participants, event.startDate)
          : ''); // Default description

      if (!props.event || JSON.stringify(event) !== JSON.stringify(props.event.rawData)) {
        this._storeNewEvent(event);
      }
    }
    toDateInputValue(date) {
      let local = new Date(date);
      local.setMinutes(date.getMinutes() - date.getTimezoneOffset());
      return local.toJSON().slice(0, 16);
    }
    makeUpReservationTimes(id, partySize, date, n) {
      // Start at (n-1)/2 half hours before the desired reservation time
      let t = new Date(date);
      t.setMinutes(t.getMinutes() - (n-1)/2*30);
      let hour = (t.getHours()) % 24;
      let minute = t.getMinutes() >= 30 ? '30' : '00';

      // Seed per restaurant and day
      let seed = parseInt(id.substr(0, 8), 16);
      let ts = t.getTime();
      ts = ts - (ts % 86400000); // Round to closest day

      let result = [];

      while (n--) {
        // This seems somewhat balanced
        let notAvailable = false; //(seed*(hour*2+minute/30)*(ts/86400000))%10 <= partySize;

        result.push({
          time: `${hour}:${minute}`,
          notAvailable
        });

        // Increment time slot
        if (minute == '30') {
          hour = (hour + 1) % 24;
          minute = '00';
        } else {
          minute = '30';
        }
      }

      return result;
    }
    createDescription(restaurantId, participants, startDate) {
      let times = this.makeUpReservationTimes(restaurantId, participants, startDate, 5);

      let closest = null;

      times.map(({time, notAvailable}, i) => {
        if (!notAvailable) {
          if (!closest || i <= 2) {
            // 2 is the closest time to default time
            closest = time;
          }
        }
      });

      return closest
        ? `Table for ${participants} available at ${closest}`
        : `No table for ${participants} available within 2 hours`;
    }
    shouldRender(props, state) {
      return Boolean(state.currentEvent);
    }
    render(props, state) {
      // TODO(noelutz): remove code that handles list rendering.
      // It has moved to ReservationAnnotation.js.
      const selectedRestaurant = props.selected;
      let partySize = parseInt(state.currentEvent.participants) || 2;
      if (selectedRestaurant) {
        return this._renderSingle(selectedRestaurant, state.currentEvent.startDate, partySize);
      }
    }
    _renderSingle(restaurant, date, partySize) {
      let restaurantId = restaurant.id || '';
      let times = this.makeUpReservationTimes(restaurantId, partySize, date, 5);
      let timePicker = {date};
      for (let i = 1; i <= 21; ++i) {
        timePicker[`selected${i}`] = Boolean(partySize == i);
      }
      return {
        subId: restaurantId,
        timePicker: {
          $template: 'time-picker',
          models: [timePicker]
        },
        availableTimes: {
          $template: 'available-times',
          models: times
        }
      };
    }
    _onDateChanged(e, state) {
      let newEvent = Object.assign({}, state.currentEvent || {participants: 2});
      newEvent.startDate = newEvent.endDate = e.data.value;
      this._storeNewEvent(newEvent);
    }
    _onPartySizeChanged(e, state) {
      let newEvent = Object.assign({}, state.currentEvent || {});
      newEvent.participants = Number(e.data.value);
      this._storeNewEvent(newEvent);
    }
    _storeNewEvent(newEvent) {
      const event = this.handles.get('event');
      event.set(new event.entityClass(newEvent));
    }
  };

});
