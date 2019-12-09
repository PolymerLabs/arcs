/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {PolymerElement} from '../deps/@polymer/polymer/polymer-element.js';
import {MessengerMixin} from './arcs-shared.js';
import {html} from '../deps/@polymer/polymer/lib/utils/html-tag.js';

class ArcsOverview extends MessengerMixin(PolymerElement) {
  static get template() {
    return html`
    <style include="shared-styles">
      :host {
        display: block;
        padding: 0;
        position: absolute;
        top: 0;
        right: 0;
        bottom: 0;
        left: 0;
      }
      #graphContainer {
        position: relative;
      }
      .legend {
        position: absolute;
        border: solid var(--mid-gray);
        border-width: 1px 0 0 1px;
        background: white;
        padding: 5px;
        bottom: 0;
        right: 0;
        z-index: 1;
      }
      .legend span[node] {
        width: 9px;
        height: 9px;
        display: inline-block;
        border: 1px solid var(--mid-gray);
      }
      .legend span[node][circle] {
        border-radius: 5px;
      }
      .legend span[edge] {
        width: 10px;
        height: 2px;
        display: inline-block;
        vertical-align: middle;
        position: relative;
      }
      .legend span[edge][arrow-right]::after {
        content: ' ';
        display: block;
        border: solid;
        border-width: 4px 6px;
        border-color: transparent;
        border-left-color: inherit;
        position: absolute;
        top: -3px;
        left: 6px;
      }
      .legend span[edge][arrow-left]::before {
        content: ' ';
        display: block;
        border: solid;
        border-width: 4px 6px;
        border-color: transparent;
        border-right-color: inherit;
        position: absolute;
        top: -3px;
        right: 6px;
      }
      .legend span[edge][circle]::after {
        content: ' ';
        display: block;
        position: absolute;
        top: -2px;
        left: 6px;
        width: 6px;
        height: 6px;
        border-radius: 3px;
        background-color: inherit;
      }
      #popup {
        position: absolute;
        border: 1px solid var(--mid-gray);
        z-index: 1;
        background: white;
        display: none;
      }
      #popupText {
        border-bottom: 1px solid var(--mid-gray);
        padding: 16px 5px;
        margin: 0;
      }
    </style>
    <div id="graphContainer">
      <div class="legend">
        <div><span node style="background: var(--highlight-blue)"></span> Particle</div>
        <div><span node circle style="background: var(--light-gray)"></span> Handle</div>
        <div><span node circle style="background: var(--dark-green)"></span> Slot</div>
        <div><span node style="background: var(--dark-red)"></span> Arc</div>
        <div><span edge arrow-right style="background: var(--dark-green); border-color: var(--dark-green);"></span> Read</div>
        <div><span edge arrow-right style="background: var(--dark-red); border-color: var(--dark-red);"></span> Write</div>
        <div><span edge arrow-left arrow-right style="background: var(--highlight-blue); border-color: var(--highlight-blue);"></span> Read-Write</div>
        <div><span edge circle style="background: var(--dark-gray)"></span> Hosted</div>
        <div><span edge circle style="background: var(--dark-green)"></span> Consume</div>
        <div><span edge circle style="background: var(--dark-red); border-color: var(--dark-red);"></span> Provide</div>
      </div>
      <div id="popup">
        <pre id="popupText"></pre>
      </div>
      <div id="graph"></div>
    </div>
`;
  }

  static get is() { return 'arcs-overview'; }

  static get properties() {
    return {
      active: {
        type: Boolean,
        observer: '_onActiveChanged',
        reflectToAttribute: true
      }
    };
  }
  constructor() {
    super();
    this._particles = new Map();
    this._handles = new Map();
    this._slots = new Map();
    this._innerArcs = new Map();
    this._operations = new Map();
    this._callbackIdToPecMsg = new Map();
    this._needsRedraw = false;
  }

  ready() {
    super.ready();
    new ResizeObserver(rects => {
      const {height, width} = rects[0].contentRect;
      this.$.graph.style.width = `${width}px`;
      this.$.graph.style.height = `${height}px`;
    }).observe(this);
    this.$.popup.addEventListener('mouseleave', e => {
      this.$.popup.style.display = 'none';
    });
  }

  onMessageBundle(messages) {
    for (const msg of messages) {
      const m = msg.messageBody;
      switch (msg.messageType) {
        case 'recipe-instantiated': {
          for (const sc of m.slotConnections) {
            if (sc.consumed) {

              this._slots.set(sc.consumed.id, {
                id: sc.consumed.id,
                label: sc.consumed.name,
                shape: 'ellipsis',
                color: this._cssVar('--dark-green'),
                font: {color: 'white'},
                details: {
                  id: sc.consumed.id
                }
              });

              const edgeId = `${sc.particleId}¯\\_(ツ)_/¯${sc.consumed.id}`;
              this._operations.set(edgeId, {
                id: edgeId,
                from: sc.particleId,
                to: sc.consumed.id,
                arrows: {
                  from: {
                    enabled: true,
                    type: 'circle'
                  }
                },
                color: {color: this._cssVar('--dark-green')}
              });
            }

            for (const provided of sc.provided) {
              this._slots.set(provided.id, {
                id: provided.id,
                label: provided.name,
                shape: 'ellipsis',
                color: this._cssVar('--dark-green'),
                font: {color: 'white'},
                details: {
                  id: provided.id
                }
              });

              const edgeId = `${sc.particleId}¯\\_(ツ)_/¯${provided.id}`;
              this._operations.set(edgeId, {
                id: edgeId,
                from: sc.particleId,
                to: provided.id,
                arrows: {
                  to: {
                    enabled: true,
                    type: 'circle'
                  }
                },
                color: {color: this._cssVar('--dark-red')}
              });
            }
          }
          break;
        }
        case 'PecLog': {
          switch (m.name) {
            case 'onConstructInnerArc':
              this._callbackIdToPecMsg.set(m.pecMsgBody.callback, m.pecMsgBody);
              break;
            case 'ConstructArcCallback': {
              const request = this._callbackIdToPecMsg.get(m.pecMsgBody.callback);
              if (!request) continue;
              this._callbackIdToPecMsg.delete(m.pecMsgBody.callback);

              const innerArcId = m.pecMsgBody.arc;
              const innerArcIdSuffix = innerArcId.substr(innerArcId.lastIndexOf(':') + 1);
              this._innerArcs.set(innerArcId, {
                id: innerArcId,
                label: `Arc ${innerArcIdSuffix}`,
                font: {color: 'white'},
                shape: 'box',
                color: this._cssVar('--dark-red'),
              });

              const transformationParticle = request.particle;
              const edgeId = `${transformationParticle}¯\\_(ツ)_/¯${innerArcId}`;
              this._operations.set(edgeId, {
                id: edgeId,
                from: transformationParticle,
                to: innerArcId,
                // arrows: 'to, from',
                color: {color: this._cssVar('--dark-red')},
                details: {
                  direction: 'both',
                }
              });

              break;
            }
            case 'InstantiateParticle': {
              const particleId = m.pecMsgBody.id;
              const spec = m.pecMsgBody.spec;
              if (!this._particles.has(particleId)) {
                this._particles.set(particleId, {
                  id: particleId,
                  shape: 'box',
                  label: spec.name,
                  color: this._cssVar('--highlight-blue'),
                  font: {color: 'white'},
                  details: {
                    id: particleId,
                    implFile: spec.implFile
                  }
                });
              }

              // TODO: FIXME: This is a workaround for slandles not having stores.
              // Use for (const [name, id] of Object.entries(m.pecMsgBody)) when slandles have stores.
              for (const handle of spec.args) {
                const name = handle.name;
                const matchingStores = Object.entries(m.pecMsgBody.stores).map(
                  ([store_name, id]) => store_name == name ? id : undefined
                ).filter(id => id);
                const id = matchingStores.length == 1 ? matchingStores[0] : `#missing-store-for-${name}`;

                this._handles.set(id, {
                  id: id,
                  label: `"${name}"`,
                  shape: 'ellipsis',
                  color: this._cssVar('--light-gray'),
                  details: {id, name}
                });

                const connSpec = spec.args.find(conn => conn.name === name);

                let color;
                let arrows;
                switch (connSpec.direction) {
                  case '`consumes':
                    arrows = {
                      from: {
                        enabled: true,
                        type: 'circle'
                      }
                    };
                    color = this._cssVar('--green');
                    break;
                  case 'reads':
                    arrows = 'from';
                    color = this._cssVar('--dark-green');
                    break;
                  case '`provides':
                    arrows = {
                      to: {
                        enabled: true,
                        type: 'circle'
                      }
                    };
                    color = this._cssVar('--red');
                    break;
                  case 'writes':
                    arrows = 'to';
                    color = this._cssVar('--dark-red');
                    break;
                  case 'reads writes':
                    arrows = 'to, from';
                    color = this._cssVar('--highlight-blue');
                    break;
                  case 'hosts':
                    arrows = {
                      from: {
                        enabled: true,
                        type: 'circle'
                      }
                    };
                    color = this._cssVar('--dark-gray');
                    break;
                }

                const edgeId = `${particleId}¯\\_(ツ)_/¯${id}`;
                this._operations.set(edgeId, {
                  id: edgeId,
                  from: particleId,
                  to: id,
                  arrows,
                  color: {color},
                  details: {
                    direction: connSpec.direction,
                    handleConnection: name,
                    type_tag: connSpec.type.tag,
                    type_names: connSpec.type.data.names
                  }
                });
              }

              this._needsRedraw = true;
              break;
            }
          }
          break;
        }
        case 'arc-selected':
        case 'page-refresh':
          this._clear();
          break;
      }
    }

    if (this._needsRedraw && this.active) this._redraw();
  }

  _onActiveChanged() {
    if (this._needsRedraw && this.active) this._redraw();
  }

  _redraw() {
    this._needsRedraw = false;
    const nodes = [...this._particles.values(), ...this._handles.values(), ...this._slots.values(), ...this._innerArcs.values()];
    const edges = [...this._operations.values()];
    if (this.graph) {
      this.graph.setData({nodes, edges});
    } else {
      this.graph = new vis.Network(this.$.graph, {nodes, edges}, {
        autoResize: true,
        height: '100%',
        width: '100%',
        nodes: {
          shapeProperties: {
            borderRadius: 0
          }
        }
      });
      this.graph.on('doubleClick', params => {
        if (params.nodes.length) {
          if (this._particles.get(params.nodes[0])) {
            this.$.popupText.innerText = JSON.stringify(
              this._particles.get(params.nodes[0]).details, null, 2);
          } else {
            this.$.popupText.innerText = JSON.stringify(
              this._handles.get(params.nodes[0]).details, null, 2);
          }
        } else if (params.edges.length) {
          this.$.popupText.innerText = JSON.stringify(
            this._operations.get(params.edges[0]).details, null, 2);
        } else {
          return;
        }
        this.$.popup.style.display = 'block';
        this.$.popup.style.left = params.pointer.DOM.x + this.$.popup.offsetWidth <= this.$.graph.offsetWidth
            ? `${params.pointer.DOM.x - 1}px`
            : `${params.pointer.DOM.x - this.$.popup.offsetWidth}px`;
        this.$.popup.style.top = params.pointer.DOM.y + this.$.popup.offsetHeight <= this.$.graph.offsetHeight
            ? `${params.pointer.DOM.y - 1}px`
            : `${params.pointer.DOM.y - this.$.popup.offsetHeight + 1}px`;
      });
    }
  }

  _clear() {
    this._particles.clear();
    this._handles.clear();
    this._slots.clear();
    this._innerArcs.clear();
    this._operations.clear();
    this._callbackIdToPecMsg.clear();
    if (this.active) this._redraw();
  }

  _cssVar(name) {
    return getComputedStyle(this).getPropertyValue(name);
  }
}

window.customElements.define(ArcsOverview.is, ArcsOverview);
