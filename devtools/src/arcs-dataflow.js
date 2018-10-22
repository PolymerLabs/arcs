import '../deps/@polymer/paper-dropdown-menu/paper-dropdown-menu.js';
import '../deps/@polymer/paper-item/paper-item.js';
import '../deps/@vaadin/vaadin-grid/vaadin-grid.js';
import '../deps/@vaadin/vaadin-grid/vaadin-grid-sorter.js';
import {PolymerElement} from '../deps/@polymer/polymer/polymer-element.js';
import {formatTime, writeOps, indentPrint, MessengerMixin} from './arcs-shared.js';
import {html} from '../deps/@polymer/polymer/lib/utils/html-tag.js';

class ArcsDataflow extends MessengerMixin(PolymerElement) {
  static get template() {
    return html`
    <style include="shared-styles">
      :host {
        display: block;
        padding: 8px;
      }
      vaadin-grid {
        height: calc(100vh - 170px);
      }
      .filter {
        display: flex;
        flex-direction: row;
        justify-content: flex-start;
        align-items: flex-start;
        margin-bottom: 10px;
      }
      .filter > * {
        margin-right: 10px;
      }
      .arc-selector {
        margin-top: -11px;
      }
      .listbox-container {
        height: 100px;
        border: 1px solid #ddd;
        overflow: scroll;
        margin-top: 3px;
      }
      label {
        font-size: 9px;
        color: var(--mid-gray);
      }
      paper-listbox {
        width: 320px;
        padding: 0;
        --paper-item: {
          white-space: nowrap;
          overflow: hidden;
        }
      }
      .filter-item {
        padding: 2px 0;
      }
      .filter-item [name] {
        line-height: 16px;
      }
      .id {
        color: #666;
        line-height: 16px;
        font-size: 10px;
        font-style: italic;
      }
      .name {
        font-style: italic;
      }
      .op-write {
        color: var(--dark-red);
        font-weight: bold;
      }
    </style>

    <div class="filter">
      <paper-dropdown-menu class="arc-selector" label="Arc ID" horizontal-align="left">
        <paper-listbox slot="dropdown-content" selected="{{selectedArcId}}" attr-for-selected="name">
          <template is="dom-repeat" items="[[arcIds]]">
            <paper-item name="[[item]]">[[item]]</paper-item>
          </template>
        </paper-listbox>
      </paper-dropdown-menu>

      <div>
        <label>Particle Filter</label>
        <div class="listbox-container">
          <paper-listbox slot="dropdown-content" multi="" selected-values="{{selectedParticleIds}}" attr-for-selected="name">
            <template is="dom-repeat" items="[[particles]]">
              <paper-item name="[[item.id]]">
                <div class="filter-item">
                  <div>[[item.name]]</div>
                  <div class="id">[[item.id]]</div>
                </div>
              </paper-item>
            </template>
          </paper-listbox>
        </div>
      </div>

      <div>
        <label>Handle Filter</label>
        <div class="listbox-container">
          <paper-listbox slot="dropdown-content" multi="" selected-values="{{selectedHandleIds}}" attr-for-selected="name">
            <template is="dom-repeat" items="[[handles]]">
              <paper-item name="[[item.id]]">
                <div class="filter-item">
                  <div><span class="name">[[item.name]]</span> [[item.type]]</div>
                  <div class="id">[[item.id]]</div>
                </div>
              </paper-item>
            </template>
          </paper-listbox>
        </div>
      </div>
    </div>

    <vaadin-grid id="grid" theme="row-dividers" items="[[filteredLog]]" multi-sort="" on-active-item-changed="_onGridRowSelected">

      <template class="row-details">
        Handle:
        <a href="javascript:void(0)" on-click="_onShowHandleToggled"><!--
       --><template is="dom-if" if="[[showHandleDetails]]">Hide</template><!--
       --><template is="dom-if" if="[[!showHandleDetails]]">Show</template><!--
     --></a>
        <pre hidden\$="[[!showHandleDetails]]">[[_indentPrint(item.handle)]]</pre>
        <br>
        Data:
        <pre>[[_indentPrint(item.data)]]</pre>
      </template>

      <vaadin-grid-column width="80px" flex-grow="0">
        <template class="header">
          <vaadin-grid-sorter path="timestamp">Time</vaadin-grid-sorter>
        </template>
        <template>[[_formatTimestamp(item.timestamp)]]</template>
      </vaadin-grid-column>

      <vaadin-grid-column width="100px" flex-grow=".5">
        <template class="header">
          <vaadin-grid-sorter path="particle.id">Particle</vaadin-grid-sorter>
        </template>
        <template>
          <div>[[item.particle.name]]</div>
          <div class="id">[[item.particle.id]]</div>
        </template>
      </vaadin-grid-column>

      <vaadin-grid-column width="80px" flex-grow="0">
        <template class="header">
          <vaadin-grid-sorter path="operation">Event</vaadin-grid-sorter>
        </template>
        <template><span class\$="[[_operationCssClass(item.operation)]]">[[item.operation]]</span></template>
      </vaadin-grid-column>

      <vaadin-grid-column width="10em">
        <template class="header">
          <vaadin-grid-sorter path="handle.id">Handle</vaadin-grid-sorter>
        </template>
        <template>
          <div><span class="name">[[item.handle.name]]</span> [[item.handle.type]]</div>
          <div class="id">[[item.handle.id]]</div>
        </template>
      </vaadin-grid-column>

      <vaadin-grid-column width="10em" flex-grow="1">
        <template class="header">Data
        </template>
        <template>[[_truncate(item.data)]]</template>
      </vaadin-grid-column>

    </vaadin-grid>
`;
  }

  static get is() { return 'arcs-dataflow'; }

  static get properties() {
    return {
      arcIds: {
        type: Array,
        computed: '_listArcIds(perArcLogs.*)'
      },
      handles: {
        type: Array,
        computed: '_listHandles(selectedArcLog.*)'
      },
      particles: {
        type: Array,
        computed: '_listParticles(selectedArcLog.*)'
      },
      selectedArcId: {
        type: String,
        observer: '_onArcSelected'
      },
      filteredLog: {
        type: Array,
        computed: '_listFilteredLog(selectedArcLog.*, selectedHandleIds.*, selectedParticleIds.*)'
      },
      queryParams: {
        type: Object,
        notify: true,
      }
    };
  }

  static get observers() {
    return [
      '_onParticleFilterChanged(selectedParticleIds.*)',
      '_onHandleFilterChanged(selectedHandleIds.*)',
      '_onQueryParams(queryParams.*)'
    ];
  }

  constructor() {
    super();
    this.selectedArcLog = [];
    this.selectedHandleIds = [];
    this.selectedParticleIds = [];
    this.perArcLogs = {};
    this.showHandleDetails = false;
    // Filter for dataflow events.
    this._filter = el => {
      if (this.selectedHandleIds.length !== 0
          && this.selectedHandleIds.indexOf(el.handle.id) === -1) {
        return false;
      }
      if (this.selectedParticleIds.length !== 0
          && this.selectedParticleIds.indexOf(el.particle.id) === -1) {
        return false;
      }
      return true;
    };
  }

  onMessageBundle(messages) {
    const current = [];
    const filtered = [];
    const rest = new Map();
    for (const msg of messages) {
      switch (msg.messageType) {
        case 'dataflow': {
          const e = msg.messageBody;
          // If user hasn't selected an arc, and this event is not from
          // a speculative execution, select this arc.
          if (!this.selectedArcId && !e.speculative && !e.arcId.endsWith('-pipes')) {
            this.set('selectedArcId', e.arcId);
          }
          if (this.selectedArcId === e.arcId) {
            current.push(e);
            if (this._filter(e)) filtered.push(e);
          } else {
            if (rest.has(e.arcId)) {
              rest.get(e.arcId).push(e);
            } else {
              rest.set(e.arcId, [e]);
            }
          }
          break;
        }
        case 'page-refresh':
        case 'arc-transition':
          this._clear();
          return; // page-refresh is not bundled with anything else.
      }
    }
    // Apply changes in bulk to avoid freezing page.
    if (current.length > 0) {
      this.push('selectedArcLog', ...current);
      this.set(`perArcLogs.${btoa(current[0].arcId)}`, this.selectedArcLog);
    }
    this.push('filteredLog', ...filtered);
    for (const [arcId, events] of rest) {
      if (!this.get(`perArcLogs.${btoa(arcId)}`)) {
        this.set(`perArcLogs.${btoa(arcId)}`, events);
      } else {
        this.push(`perArcLogs.${btoa(arcId)}`, ...events);
      }
    }
  }

  _clear() {
    this.set('perArcLogs', {});
    this.set('selectedArcId', '');
  }

  _listFilteredLog() {
    return this.selectedArcLog.filter(this._filter);
  }

  _listArcIds() {
    return Object.getOwnPropertyNames(this.perArcLogs).map(x => atob(x)).sort(this._compareIds);
  }

  _listHandles() {
    return this._listUnique(event => event.handle);
  }

  _listParticles() {
    return this._listUnique(event => event.particle);
  }

  _listUnique(extract) {
    const bag = {};
    this.selectedArcLog.forEach(event => {
      const extracted = extract(event);
      if (extracted) bag[extracted.id] = extracted;
    });
    return Object.values(bag).sort((x, y) => this._compareIds(x.id, y.id));
  }

  _onArcSelected(arcId) {
    this.set('selectedHandleIds', []);
    this.set('selectedParticleIds', []);
    this.set('selectedArcLog', this.get(`perArcLogs.${btoa(arcId)}`) || []);
  }

  _onParticleFilterChanged() {
    if (!this.queryParams) return;
    this.set('queryParams.particleFilter', this.selectedParticleIds.join(',') || null);
  }

  _onHandleFilterChanged() {
    if (!this.queryParams) return;
    this.set('queryParams.handleFilter', this.selectedHandleIds.join(',') || null);
  }

  _onQueryParams() {
    this.set('selectedParticleIds', this.queryParams.particleFilter
        ? this.queryParams.particleFilter.split(',') : []);
    this.set('selectedHandleIds', this.queryParams.handleFilter
        ? this.queryParams.handleFilter.split(',') : []);
  }

  _onGridRowSelected(e) {
    this.$.grid.detailsOpenedItems = [e.detail.value];
  }

  _onShowHandleToggled() {
    this.showHandleDetails = !this.showHandleDetails;
  }

  _formatTimestamp(timestamp) {
    return formatTime(timestamp, 3 /* with millis */);
  }

  _truncate(data) {
    if (!data) return data;
    // Limiting for quicker rendering.
    return data.length > 100 ? data.substring(0, 100) : data;
  }

  _indentPrint(thing) {
    return indentPrint(thing); // from arcs-shared
  }

  _operationCssClass(operation) {
    return writeOps.indexOf(operation) > -1 ? 'op-write' : 'op-read';
  }

  // Compare the id segments numerically if possible,
  // lexicographically otherwise.
  _compareIds(idString1, idString2) {
    const ids1 = idString1.split(':');
    const ids2 = idString2.split(':');
    for (let i = 0; i < Math.min(ids1.length, ids2.length); i++) {
      const n1 = Number(ids1[i]);
      const n2 = Number(ids2[i]);
      let lexComp;
      if ((!n1 || !n2) && (lexComp = ids1[i].localeCompare(ids2[i])) !== 0) {
        return lexComp;
      }
      if ((n1 && n2) && n1 !== n2) return n1 - n2;
    }
    return ids1.length - ids2.length;
  }
}

window.customElements.define(ArcsDataflow.is, ArcsDataflow);
