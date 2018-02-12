/*
@license
Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

document.body.appendChild(Object.assign(document.createElement('link'), {
  rel: 'import',
  href: `${shellPath}/components/strategy-explorer/strategy-explorer.html`
}));
// <link rel="import" href="arc-explorer.html"></link>

// include for strategy-explorer on Safari
/*
document.head.appendChild(Object.assign(document.createElement('script'), {
  src: `https://rawgit.com/webcomponents/html-imports/master/html-imports.min.js`
}));
*/

document.head.appendChild(Object.assign(document.createElement('style'), {innerText:
  `.explorer {
    display: none;
    background-color: white;
    top: 0;
    width: 100%;
    height: 100%;
    position: fixed;
    z-index: 2000;
  }`
}));

(function() {

  const explorer = document.body.appendChild(document.createElement('strategy-explorer'));
  explorer.className = 'explorer';
  window.addEventListener('keydown', e => {
    if (e.ctrlKey && e.key == 'e') {
      e.preventDefault();
      explorer.style.display = explorer.style.display == 'block' ? 'none' : 'block';
    }
  });

  const populate = (population) => explorer.results = population.map(pop => explorer.preparePopulation(pop));
  document.addEventListener('generations', e => {
    if (explorer.reset) {
      explorer.reset();
      setTimeout(()=>populate(e.detail), 0);
    }
  });

/*
  let arcExplorer = document.body.appendChild(document.createElement('arc-explorer'));
  arcExplorer.className = 'explorer';
  window.addEventListener('keydown', e => {
    if (e.target.localName !== 'input' && e.target.localName !== 'textarea') {
      if (e.ctrlKey && (e.key == 'a')) {
        e.preventDefault();
        arcExplorer.style.display = arcExplorer.style.display == 'block' ? 'none' : 'block';
        //console.log(arcExplorer.arc);
      }
    }
  });
  document.addEventListener('apply', e => {
    arcExplorer.arc = e.detail.arc;
  });
*/

})();
