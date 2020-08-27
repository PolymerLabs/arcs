/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Xen} from '../../../lib/xen/xen-import.js';

export const devtoolsStyles = Xen.html`
<style>
  :host {
    --light-gray: #f3f3f3;
    --mid-gray: #ccc;
    --dark-gray: #888;
    --highlight-blue: #3879d9;
    --focus-blue: #03a9f4;
    --light-focus-blue: #e4f6ff;
    --dark-red: #b71c1c;
    --red: #ff0000;
    --dark-green: #09ba12;
    --green: #00ff00;
    --darker-green: #08780e;

    --devtools-purple: rgb(136, 19, 145);
    --devtools-blue: rgb(13, 34, 170);
    --devtools-red: rgb(196, 26, 22);

    --drop-shadow: 0 0 0 1px rgba(0, 0, 0, 0.05), 0 2px 4px rgba(0, 0, 0, 0.2), 0 2px 6px rgba(0, 0, 0, 0.1);
  }
  header.header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background-color: var(--light-gray);
    border-bottom: 1px solid var(--mid-gray);
    height: 26px;
    line-height: 0;
  }
  header.header > [section] {
    display: flex;
    align-items: center;
    height: 26px;
  }
  header.header iron-icon {
    display: inline-block;
    width: 28px;
    height: 24px;
    color: rgb(110, 110, 110);
  }
  header.header iron-icon[disabled] {
    color: rgb(180, 180, 180);
  }
  header.header iron-icon:not([disabled]):not([active]):hover {
    color: rgb(51, 51, 51);
  }
  header.header iron-icon[active] {
    color: var(--highlight-blue);
  }
  header.header [divider] {
    background-color: var(--mid-gray);
    width: 1px;
    margin: 4px 5px;
    height: 16px;
  }
  .devtools-icon {
    display: inline-block;
    width: 28px;
    height: 24px;
    -webkit-mask-image: -webkit-image-set(
        url(img/devtools_icons_1x.png) 1x,
        url(img/devtools_icons_2x.png) 2x);
    background-color: rgb(110, 110, 110);
  }
  .devtools-small-icon {
    display: inline-block;
    width: 10px;
    height: 10px;
    min-width: 10px;
    -webkit-mask-image: -webkit-image-set(
        url(img/devtools_icons_color_1x.png) 1x,
        url(img/devtools_icons_color_2x.png) 2x);
    background-color: rgb(110, 110, 110);
  }
  .devtools-icon:not([disabled]):hover, .devtools-small-icon:not([disabled]):hover {
    background-color: rgb(51, 51, 51);
  }
  .devtools-icon-color {
    display: inline-block;
    background-image: -webkit-image-set(
        url(img/devtools_icons_color_1x.png) 1x,
        url(img/devtools_icons_color_2x.png) 2x);
    width: 10px;
    height: 10px;
  }
  .triangle {
    -webkit-mask-position: 0px 10px;
    /* margin: 0 5px; */
    padding-right: 4px;
    zoom: .8;
  }
  [expanded].triangle {
    -webkit-mask-position: -80px 30px;
  }
  vaadin-split-layout {
    height: 100%;
  }
  vaadin-split-layout > aside {
    background-color: var(--light-gray);
    overflow: auto;
  }
  vaadin-split-layout > aside.paddedBlocks > * {
    margin: 5px 5px 5px 2px;
  }
  .dropdown {
    box-shadow: var(--drop-shadow);
    background-color: white;
  }
  .material-icons {
    font-family: 'Material Icons';
    font-weight: normal;
    font-style: normal;
    font-size: 24px;  /* Preferred icon size */
    display: inline-block;
    line-height: 1;
    text-transform: none;
    letter-spacing: normal;
    word-wrap: normal;
    white-space: nowrap;
    direction: ltr;

    /* Support for all WebKit browsers. */
    -webkit-font-smoothing: antialiased;
    /* Support for Safari and Chrome. */
    text-rendering: optimizeLegibility;

    /* Support for Firefox. */
    -moz-osx-font-smoothing: grayscale;

    /* Support for IE. */
    font-feature-settings: 'liga';
  }
  .empty-label {
    text-align: center;
    font-style: italic;
    color: var(--mid-gray);
    white-space: nowrap;
  }
</style>
`;
