import {PolymerElement} from '../deps/@polymer/polymer/polymer-element.js';
import '../deps/@vaadin/vaadin-split-layout/vaadin-split-layout.js';
import {MessengerMixin} from './arcs-shared.js';
import '../deps/@vaadin/vaadin-split-layout/vaadin-split-layout.js';
import {html} from '../deps/@polymer/polymer/lib/utils/html-tag.js';

class ArcsOverview extends MessengerMixin(PolymerElement) {
  static get template() {
    return html`
    <style include="shared-styles">
      :host {
        display: block;
        padding: 0;
      }
      #graphContainer {
        position: relative;
      }
      .legend {
        position: absolute;
        border: solid var(--mid-gray);
        border-width: 1px 0 0 1px;
        padding: 5px;
        bottom: 0;
        right: 0;
      }
      .legend span[node] {
        width: 9px;
        height: 9px;
        display: inline-block;
        border: 1px solid var(--mid-gray);
        border-radius: 3px;
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
      .nav-list a:hover {
        background-color: var(--light-gray);
      }
    </style>
    <div id="graphContainer">
      <div class="legend">
        <div><span node style="background: var(--highlight-blue)"></span> Particle</div>
        <div><span node style="background: var(--light-gray)"></span> Handle</div>
        <div><span node style="background: var(--dark-green)"></span> Slot</div>
        <div><span node style="background: var(--darker-green)"></span> Hosted Slot</div>
        <div><span edge arrow-right style="background: var(--dark-green); border-color: var(--dark-green);"></span> Read</div>
        <div><span edge arrow-right style="background: var(--dark-red); border-color: var(--dark-red);"></span> Write</div>
        <div><span edge arrow-left arrow-right style="background: var(--highlight-blue); border-color: var(--highlight-blue);"></span> Read-Write</div>
        <div><span edge circle style="background: var(--dark-gray)"></span> Hosted</div>
        <div><span edge circle style="background: var(--dark-green)"></span> Consume</div>
        <div><span edge circle style="background: var(--dark-red); border-color: var(--dark-red);"></span> Provide</div>
      </div>
      <div id="popup">
        <pre id="popupText"></pre>
        <div class="nav-list">
          <a id="dataflowLink" href=""><iron-icon icon="swap-horiz"></iron-icon>Show in Dataflow</a>
        </div>
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
    this._operations = new Map();
    this._callbackIdToPecMsg = new Map();
    this._innerArcToTransformationParticle = new Map();
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
              // TODO: Instead of fetching existing slot, use vis.DataSet,
              // which allows per-attribute updates.
              const existingSlotEntry = this._slots.get(sc.consumed.id);
              const hosted = existingSlotEntry && existingSlotEntry.hosted;
              
              this._slots.set(sc.consumed.id, {
                id: sc.consumed.id,
                label: sc.consumed.name,
                hosted,
                color: this._cssVar(hosted ? '--darker-green' : '--dark-green'),
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
                color: {color: this._cssVar(hosted ? '--darker-green' : '--dark-green')}
              });
            }
  
            for (const provided of sc.provided) {
              this._slots.set(provided.id, {
                id: provided.id,
                label: provided.name,
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
            case 'onArcCreateHandle':
            case 'onArcCreateSlot':
              this._callbackIdToPecMsg.set(m.pecMsgBody.callback, m.pecMsgBody);
              break;
            case 'ConstructArcCallback': {
              const request = this._callbackIdToPecMsg.get(m.pecMsgBody.callback);
              if (!request) continue;
              this._callbackIdToPecMsg.delete(m.pecMsgBody.callback);
              this._innerArcToTransformationParticle.set(m.pecMsgBody.arc, request.particle);
              break;
            }
            case 'CreateHandleCallback': {
              const request = this._callbackIdToPecMsg.get(m.pecMsgBody.callback);
              if (!request) continue;
              this._callbackIdToPecMsg.delete(m.pecMsgBody.callback);

              const handleId = m.pecMsgBody.id;
              const handleName = m.pecMsgBody.name;
              const particleId = this._innerArcToTransformationParticle.get(request.arc);
              if (!particleId) continue;

              this._handles.set(handleId, {
                id: handleId,
                label: handleName ? `"${handleName}"` : '?',
                color: this._cssVar('--light-gray'),
                details: {
                  id: handleId,
                  name: handleName,
                }
              });

              const edgeId = `${particleId}¯\\_(ツ)_/¯${handleId}`;
              this._operations.set(edgeId, {
                id: edgeId,
                from: particleId,
                to: handleId,
                arrows: 'to, from',
                color: {color: this._cssVar('--highlight-blue')},
                details: {
                  direction: 'both',
                }
              });
              break;
            }
            case 'CreateSlotCallback': {
              const request = this._callbackIdToPecMsg.get(m.pecMsgBody.callback);
              if (!request) continue;
              this._callbackIdToPecMsg.delete(m.pecMsgBody.callback);

              const slotId = m.pecMsgBody.hostedSlotId;
              const particleId = request.transformationParticle;

              this._slots.set(slotId, {
                id: slotId,
                hosted: true,
                color: this._cssVar('--darker-green'),
                font: {color: 'white'},
                details: {
                  id: slotId
                }
              });

              const edgeId = `${particleId}¯\\_(ツ)_/¯${slotId}`;
              this._operations.set(edgeId, {
                id: edgeId,
                from: particleId,
                to: slotId,
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
        // TODO: Move handle connections to 'recipe-instantiated' call.
        // Stop relying on 'InstantiateParticle' as it will get deleted soon.
        case 'InstantiateParticle': {
          if (m.speculative || m.arcId.endsWith('-pipes')) continue;

          if (!this._particles.has(m.id)) {
            this._particles.set(m.id, {
              id: m.id,
              label: m.name,
              color: this._cssVar('--highlight-blue'),
              font: {color: 'white'},
              details: {
                id: m.id,
                implFile: m.implFile
              }
            });
          }

          for (const name of Object.getOwnPropertyNames(m.connections)) {
            const con = m.connections[name];
            this._handles.set(con.id, {
              id: con.id,
              label: `${con.name ? ('"' + con.name + '"') : ''} ${con.type}`,
              color: this._cssVar('--light-gray'),
              details: {
                id: con.id,
                storageKey: con.storageKey,
                name: con.name,
                type: con.type
              }
            });

            let color;
            let arrows;
            switch (con.direction) {
              case 'in':
                arrows = 'from';
                color = this._cssVar('--dark-green');
                break;
              case 'out':
                arrows = 'to';
                color = this._cssVar('--dark-red');
                break;
              case 'inout':
                arrows = 'to, from';
                color = this._cssVar('--highlight-blue');
                break;
              case 'host':
                arrows = {
                  from: {
                    enabled: true,
                    type: 'circle'
                  }
                };
                color = this._cssVar('--dark-gray');
                break;
            }

            const edgeId = `${m.id}¯\\_(ツ)_/¯${con.id}`;
            this._operations.set(edgeId, {
              id: edgeId,
              from: m.id,
              to: con.id,
              arrows,
              color: {color},
              details: {
                direction: con.direction,
                handleConnection: name
              }
            });
          }

          this._needsRedraw = true;
          break;
        }
        case 'page-refresh':
        case 'arc-transition':
          this._clear();
          return; // page-refresh is not bundled with anything else.
      }
    }

    if (this._needsRedraw && this.active) this._redraw();
  }

  _onActiveChanged() {
    if (this._needsRedraw && this.active) this._redraw();
  }

  _redraw() {
    this._needsRedraw = false;
    const nodes = [...this._particles.values(), ...this._handles.values(), ...this._slots.values()];
    const edges = [...this._operations.values()];
    if (this.graph) {
      this.graph.setData({nodes, edges});
    } else {
      this.graph = new vis.Network(this.$.graph, {nodes, edges}, {
        autoResize: true,
        height: '100%',
        width: '100%',
        nodes: {
          shape: 'box'
        }
      });
      this.graph.on('doubleClick', params => {
        if (params.nodes.length) {
          if (this._particles.get(params.nodes[0])) {
            this.$.popupText.innerText = JSON.stringify(
              this._particles.get(params.nodes[0]).details, null, 2);
            this.$.dataflowLink.href = `?particleFilter=${encodeURIComponent(params.nodes[0])}#dataflow`;
          } else {
            this.$.popupText.innerText = JSON.stringify(
              this._handles.get(params.nodes[0]).details, null, 2);
            this.$.dataflowLink.href = `?handleFilter=${encodeURIComponent(params.nodes[0])}#dataflow`;
          }
        } else if (params.edges.length) {
          this.$.popupText.innerText = JSON.stringify(
            this._operations.get(params.edges[0]).details, null, 2);
          const edgeNodes = params.edges[0].split('¯\\_(ツ)_/¯');
          this.$.dataflowLink.href = `?particleFilter=${encodeURIComponent(edgeNodes[0])}&handleFilter=${encodeURIComponent(edgeNodes[1])}#dataflow`;
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
    this._operations.clear();
    this._innerArcToTransformationParticle.clear();
    this._callbackIdToPecMsg.clear();
    if (this.active) this._redraw();
  }

  _cssVar(name) {
    return getComputedStyle(this).getPropertyValue(name);
  }
}

window.customElements.define(ArcsOverview.is, ArcsOverview);
