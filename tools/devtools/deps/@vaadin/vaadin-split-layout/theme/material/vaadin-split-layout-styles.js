/// BareSpecifier=@vaadin\vaadin-split-layout\theme\material\vaadin-split-layout-styles
import '../../../vaadin-material-styles/color.js';
import { html } from '../../../../@polymer/polymer/lib/utils/html-tag.js';

const $_documentContainer = html`<dom-module id="material-split-layout" theme-for="vaadin-split-layout">
  <template>
    <style>
      [part="splitter"] {
        min-width: 8px;
        min-height: 8px;
        background-color: var(--_material-split-layout-splitter-background-color, #000);
      }

      [part="handle"] {
        display: flex;
        align-items: center;
        justify-content: center;
      }

      [part="handle"]::after {
        content: "";
        display: block;
        width: 2px;
        height: 24px;
        background-color: var(--material-background-color);
      }

      :host([orientation="vertical"]) [part="handle"]::after {
        transform: rotate(90deg);
      }
    </style>
  </template>
</dom-module>`;

document.head.appendChild($_documentContainer.content);