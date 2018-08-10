/*
Copyright (c) 2017 Google Inc. All rights reserved.
This code may only be used under the BSD style license found at
http://polymer.github.io/LICENSE.txt
Code distributed by Google as part of this project is also
subject to an additional IP rights grant found at
http://polymer.github.io/PATENTS.txt
*/

import '../../deps/@polymer/polymer/polymer-legacy.js';
import './se-shared.js';
import {Polymer} from '../../deps/@polymer/polymer/lib/legacy/polymer-fn.js';
import {html} from '../../deps/@polymer/polymer/lib/utils/html-tag.js';

Polymer({
  _template: html`
    <style include="se-shared-styles">
      :host([find-highlight]) {
        background: white;
      }

      #recipe-box {
        white-space: pre;
        font-family: consolas;
        font-size: 10px;
        margin: 5px;
        padding: 5px;
        width: 40px;
        height: 40px;
      }

      #hash {
        color: #555;
        font-style: italic;
        text-align: center;
      }

      #recipe-box:not([resolved])>#hash {
        display: none;
      }
    </style>
    <div id="recipe-box" valid\$="{{recipe.valid}}" active\$="{{recipe.active}}" selected\$="{{selected}}" selectedparent\$="{{selectedParent}}" selectedancestor\$="{{selectedAncestor}}" selectedchild\$="{{selectedChild}}" selecteddescendant\$="{{selectedDescendant}}" terminal\$="{{terminal}}" resolved\$="{{recipe.resolved}}" combined\$="{{recipe.combined}}" irrelevant\$="{{recipe.irrelevant}}" diff\$="[[recipe._diff]]"><div>{{recipe.score}}</div><div id="hash">{{shortHash}}</div></div>
`,

  is: 'se-recipe',

  properties: {
    shortHash: String,
    findHighlight: {
      type: Boolean,
      reflectToAttribute: true
    },
    recipe: Object
  },

  observers: [
    '_recipeChanged(recipe)',
  ],

  _recipeChanged: function(recipe) {
    // Maintain find-highlight after results are reloaded.
    this.setFindPhrase(document.strategyExplorer.$.find.phrase);

    this.selected = false;
    this.selectedParent = false;
    this.selectedAncestor = false;
    this.selectedChild = false;
    this.selectedDescendant = false;

    this.ancestors = new Set();
    this.childrens = new Set();
    this.set('terminal', true);
    this.descendants = new Set();
    this.parents = new Set();
    this.strategyMap = new Map();

    // Disable everything apart from the recipe diff on hover
    // for 'missing' recipes in the diff between planner runs.
    if (this.recipe._diff === 'remove') return;

    document.strategyExplorer.idMap.set(this.recipe.id, this);

    this.recipe.derivation.forEach(derivation => {
      if (derivation.parent !== undefined) {
        let newParent = document.strategyExplorer.idMap.get(derivation.parent);

        let setupContext = (newParent => {
          this.strategyMap.set(newParent, [[derivation.strategy]]);
          if (!this.parents.has(newParent)) {
            this.parents.add(newParent);

            newParent.strategyMap.forEach((valueList, key) => {
              valueList.forEach(value => {
                let strategyList = value.slice();
                strategyList.push(derivation.strategy);
                if (this.strategyMap.get(key) == undefined) {
                  this.strategyMap.set(key, []);
                }
                this.strategyMap.get(key).push(strategyList);
              });
            });

            newParent.parents.forEach(elem => this.ancestors.add(elem));
            newParent.ancestors.forEach(elem => this.ancestors.add(elem));

            newParent.childrens.add(this);
            newParent.set('terminal', false);

            newParent.parents.forEach(parent => parent.descendants.add(this));
            newParent.ancestors.forEach(ancestor => ancestor.descendants.add(this));

          }
        });

        if (newParent == undefined) {
          if (!document.strategyExplorer.pendingActions.has(
                  derivation.parent)) {
            document.strategyExplorer.pendingActions.set(derivation.parent, []);
          }
          document.strategyExplorer.pendingActions.get(derivation.parent).push(setupContext);
        } else {
          setupContext(newParent);
        }
      }
    });
    this.shortHash = this.recipe.hash.substring(this.recipe.hash.length - 4);

    if (document.strategyExplorer.pendingActions.has(this.recipe.id)) {
      document.strategyExplorer.pendingActions.get(this.recipe.id).forEach(action => action(this));
    }
  },

  attached: function() {
    let recipeView = document.strategyExplorer.shadowRoot.querySelector('se-recipe-view');
    this.$['recipe-box'].addEventListener('mouseenter', e => {
      recipeView.over = this;
      recipeView.recipe = this.recipe;
    });
    this.$['recipe-box'].addEventListener('mouseleave', e => {
      recipeView.resetToPinned();
    });
    this.$['recipe-box'].addEventListener('click', e => {
      if (this.recipe._diff === 'remove') return;
      if (document._selectedBox !== undefined) {
        document._selectedBox.selected = false;
        document._selectedBox.parents.forEach(parent => parent.selectedParent = false);
        document._selectedBox.ancestors.forEach(ancestor => ancestor.selectedAncestor = false);
        document._selectedBox.childrens.forEach(child => child.selectedChild = false);
        document._selectedBox.descendants.forEach(descendant => descendant.selectedDescendant = false);
        recipeView.unpin();

        if (document._selectedBox === this) {
          document._selectedBox = undefined;
          return;
        }
      }
      this.selected = true;
      this.parents.forEach(parent => parent.selectedParent = true);
      this.ancestors.forEach(ancestor => ancestor.selectedAncestor = true);
      this.childrens.forEach(child => child.selectedChild = true);
      this.descendants.forEach(descendant => descendant.selectedDescendant = true);
      document._selectedBox = this;

      recipeView.over = this;
      recipeView.recipe = this.recipe;
      recipeView.pin();
    });
    document.addEventListener('select-hash', e => {
      if (this.shortHash == e.detail) {
        this.$['recipe-box'].click();
      }
    });
  },

  setFindPhrase: function(phrase) {
    this.findHighlight = !!phrase &&
        (this.recipe.result.toLowerCase().includes(phrase.toLowerCase()) ||
        (this.recipe.description && this.recipe.description.toLowerCase().includes(phrase.toLowerCase())));
  }
});
