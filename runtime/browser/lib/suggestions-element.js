/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

require('../lib/x-toast.js');

let template = Object.assign(document.createElement('template'), {innerHTML: `

<style>
  x-toast[suggestion-container] {
    background-color: white;
    /*margin: 0 2px;*/
  }
  suggest {
    display: block;
    box-shadow: 0px 1px 5px 0px rgba(102,102,102,0.21);
    background-color: white;
    color: #666666;
    margin: 6px;
    padding: 4px;
    margin-bottom: 8px;
    cursor: pointer;
  }
  suggest:hover {
    background-color: rgba(86,255,86,0.25);
    box-shadow: 0px 3px 11px 0px rgba(102,102,102,0.41);
    padding-top: 2px;
    margin-bottom: 10px;
    color: black;
  }
</style>

<x-toast open suggestion-container>
  <div slot="header"><img src="../assets/dots.png"></div>
  <suggestions></suggestions>
</x-toast>

`.trim()});

class SuggestionsElement extends HTMLElement {
  connectedCallback() {
    if (!this._mounted) {
      this._mounted = true;
      this._root = this.attachShadow({mode: 'open'});
      this._root.appendChild(document.importNode(template.content, true));
      this.toast = this._root.querySelector('x-toast');
      this.container = this._root.querySelector('suggestions');
    }
  }

  add({plan, description, rank}, index) {
    let model = {
      index,
      innerHTML: description,
      onclick: () => { this.choose(plan); }
    };
    this.container.insertBefore(
      Object.assign(document.createElement("suggest"), model),
      this.container.firstElementChild
    );
  }

  choose(plan) {
    this.toast.open = false;
    // TODO(sjmiles): wait for toast animation
    setTimeout(() => {
      this.container.textContent = '';
      plan.instantiate(this.arc);
      this.callback();
    }, 80);
  }
}

customElements.define('suggestions-element', SuggestionsElement);
