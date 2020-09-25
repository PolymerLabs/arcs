/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import Xen from '../xen/xen.js';
import '../xen/xen-async.js';

let template = Xen.html`
  <div id="player"></div>
`;

template = Xen.Template.createTemplate(template);

const log = Xen.logFactory('YouTube', '#00701a');

class YoutubeViewer extends Xen.Async {
  get template() {
    return template;
  }

  _didMount() {
    // 2. This code loads the IFrame Player API code asynchronously.
    const tag = document.createElement('script');

    tag.src = 'https://www.youtube.com/iframe_api';
    const body = document.body;
    body.appendChild(tag);

    window.onYouTubeIframeAPIReady = () => this.setupPlayer();
    this.currentCaption = 0;
  }

  startTimer() {
    this._intervalTimer = setInterval(() => this.fireTimeEvent(), 100);
  }

  onPlayerReady(event) {
    event.target.playVideo();
  }

  fireTimeEvent() {
    if (this.player == null) {
      return;
    }

    if (this.player.getCurrentTime == null) {
      return;
    }

    const time = this.player.getCurrentTime();
    if (this.texts != null) {
      let i = 0;
      while (i < this.texts.length) {
        const text = this.texts[i];
        if (time >= text.start && time <= text.start + text.duration) {
          if (this.currentCaption != i) {
            this.currentCaption = i;
            this.value = {time, text: text.text};
            this.fire('caption');
          }
          break;
        }
        i++;
      }
    }
  }

  onPlayerStateChange(event) {
    if (this._intervalTimer &&
      (event.data == YT.PlayerState.ENDED || event.data == YT.PlayerState.PAUSED)) {
      clearInterval(this._intervalTimer);
      this._intervalTimer = 0;
    } else if (event.data == YT.PlayerState.PLAYING) {
      if (!this._intervalTimer) {
        this.startTimer();
      }
    }
  }

  setupPlayer() {
    this.player = new YT.Player(this.host.getElementById('player'), {
      height: '390',
      width: '640',
      videoId: this.videoid,
      events: {
        'onReady': (evt) => this.onPlayerReady(evt),
        'onStateChange': (evt) => this.onPlayerStateChange(evt)
      }
    });

    const self = this;
    window.fetch(`https://www.youtube.com/api/timedtext?v=${this.videoid}&lang=en`).then(r => r.text())
      .then(xmlText => {
        const xml = (new window.DOMParser()).parseFromString(xmlText, 'text/xml');
        self.texts = [];
        for (const node of xml.getElementsByTagName('text')) {
          self.texts.push({
            start: Number(node.getAttribute('start')),
            duration: Number(node.getAttribute('dur')),
            text: node.innerHTML
          });
        }
      });
  }

  stopVideo() {
    this.player.stopVideo();
  }

  static get observedAttributes() {
    return ['videoid', 'time'];
  }

  _getInitialState() {
    return {
      videoid: '',
      time: 0
    };
  }

  _willReceiveProps(props, state) {
    if ('videoid' in props) {
      state.videoid = props.videoid;
    }
    state.time = props.time;
  }

  _render(props, state) {
    return {
      videoid: state.videoid
    };
  }
}

customElements.define('youtube-viewer', YoutubeViewer);

export default YoutubeViewer;
