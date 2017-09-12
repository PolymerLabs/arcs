/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

let template = Object.assign(document.createElement('template'), {innerHTML: `
<style>
  x-toast[suggestion-container] {
    background-color: white;
  }
  suggestions {
    display: block;
    max-height: 500px;
    overflow-y: auto;
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
  <div slot="header">
    <img alt="dots" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADQAAAAICAYAAAC2wNw9AAACdElEQVQ4jd2UPUyTURSGn/u1BSmt0FZqpcWKQCLCYIwMaEUTSGAganRhQwc3DbPRgcGEsBgwDiZGJU4MxoFJjI0R+TEhDkaIkhjlp4Uq0gL9AfrzHYey9oPReO50h+c973vvyVEiIgAr60JwJgNAa6OFI+WK/VZ6eorMzGe0CjclnVf3zYGOhF8gOyuosiaUq23fZDj5i9GFcQDa/QG8pYcBUCIiwdksd4a3WI4JAJUORV9XCa0N5j2F4/29JJ8/Rk8lUSYTRc3ncQw8QXN7jMHtRXKfOpHVL/m7CbSabrSTQ3v2HF0Yp2fsPuHkbwC8pW4GW+7R7g+gltZ0uTaQYDMlVDo1AJajOgetipc9NqpchX9q69UwsVs3MFfXoKw20HNk5maxXumi/NEzQ1O56QASmgC7AmWBXBpJgvnMQ1TV7YLcwmaYjpGbbOzE8dnyjxZKRCgrtvPm8lO0918zhKP5MCIgApVOjXBUCM5mDE1tvx5BczjzYUQHpTAfqyU9PUlu8WdBTlLfkLUJKAWUGRAwF4EF9OUhw56jS+MsJVbw2T3I7vHZPYQSEd6GptAM6X+yFIrCU6NdqLfgdSqWozpKgVL5kfM6Fa0NFkPpAx2X0GNRJJUApYEI2fnvFDWdxXS0urAl6wmU6xwkAckCCrJpyIBWed2wZ3tVAJ/NQyge2Y2mCMUj+Gwe2nzNmB709/Yed5v4MJdlflVYiwuH7PmlcMpvMhS31DdCNkt6coxcJIxsxCgOXKS8bxBVajNkNVcbshmE9V+QzoEOprputNo+Q6682E5dmZ93oY/82AzxZztGRYmDwZa7nHY35Lcc/D9r+y9bbAxYGnHEIgAAAABJRU5ErkJggg==">
  </div>
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

  addSuggestion({plan, descriptionGenerator, rank, hash}, index) {
    let model = {
      index,
      innerHTML: descriptionGenerator.description,
      onclick: () => {
        this.toast.open = false;
        // TODO(sjmiles): wait for toast animation to avoid jank
        setTimeout(()=>this._choose(plan, descriptionGenerator), 80);
      }
    };
    let suggest = Object.assign(document.createElement("suggest"), model);
    suggest.setAttribute("hash", hash);
    this.container.insertBefore(suggest, this.container.firstElementChild);
  }

  add(suggestions) {
    suggestions.forEach((suggestion, i) => this.addSuggestion(suggestion, i));
  }

  _choose(plan, descriptionGenerator) {
    this.container.textContent = "";
    this.dispatchEvent(new CustomEvent("plan-selected", {
      detail: { plan, descriptionGenerator }
    }));
  }

}

customElements.define('suggestions-element', SuggestionsElement);
