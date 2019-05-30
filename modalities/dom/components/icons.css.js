/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
export default `
  icon {
    font-family: "Material Icons";
    font-size: 24px;
    font-style: normal;
    -webkit-font-feature-settings: "liga";
    -webkit-font-smoothing: antialiased;
    cursor: pointer;
    user-select: none;
    flex-shrink: 0;
    /* partial FOUC prevention */
    display: inline-block;
    width: 24px;
    height: 24px;
    overflow: hidden;
  }
  icon[hidden] {
    /* required because of display rule above,
    display rule required for overflow: hidden */
    display: none;
  }
`;
