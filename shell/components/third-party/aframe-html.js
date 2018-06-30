/*
@license
Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

import Xen from '../xen/xen.js';

const Template = Xen.Template;
const entityTemplate = Template.html`

<a-entity geometry$="{{geometry}}" rotation$="{{rotation}}" position$="{{position}}" material$="{{material}}"></a-entity>

`;

const htmlTemplate = Template.html`

<div>
  <div id="{{id}}" style="position: absolute; top: 0; display: inline-block; font-size: 256px;" unsafe-html="{{html}}"></div>
</div>

`;

class AFrameHtml extends Xen.Base {
  static get observedAttributes() { return ['html', 'rotation', 'position', 'width', 'height', 'geometry', 'material']; }
  _getInitialState() {
    const id = `h${Math.floor((Math.random()+1)*1e7)}`;
    return {
      id,
      position: `0 0.1 -2`,
      material: `shader: html; target: #${id}; ratio: height; fps: 1;`,
      html: 'Hello World'
    };
  }
  _didMount() {
    const container = document.querySelector('[vrhtml]');
    const content = Xen.Template.stamp(htmlTemplate).appendTo(container);
    const entity = Xen.Template.stamp(entityTemplate);
    entity.set(this._state);
    this.parentElement.insertBefore(entity.root, this);
    this._setState({content, entity});
  }
  _render(props, state) {
    const {html} = props;
    const {id, content, entity} = state;
    if (content) {
      content.set({id, html});
    }
    if (entity) {
      let geometry = props.geometry;
      if (!geometry) {
        const width = props.width || 1;
        const height = props.height || 0.5;
        geometry = `primitive: plane; width: ${width}; height: ${height}`;
      }
      const position = props.position || state.position;
      const rotation = props.rotation || state.rotation;
      const material = props.material || state.material;
      entity.set({geometry, position, rotation, material});
    }
  }
}
customElements.define('aframe-html', AFrameHtml);
