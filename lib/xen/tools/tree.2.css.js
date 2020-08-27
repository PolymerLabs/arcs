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
ul, ul ul {
list-style: none;
  margin: 0;
  padding: 0;
}
ul ul {
  margin-left: 10px;
}
ul li {
  margin: 0;
  padding: 0 7px;
  line-height: 20px;
  border-left:1px solid rgb(100,100,100);
}
ul li:before {
  position:relative;
  top:-0.3em;
  height:1em;
  width:12px;
  color:white;
  border-bottom:1px solid rgb(100,100,100);
  content:"";
  display:inline-block;
  left:-7px;
}
ul:last-child > li {
  border-left:none;
}
ul:last-child > li:before {
  border-left:1px solid rgb(100,100,100);
}
`;
