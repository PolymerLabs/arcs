/*
@license
Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/
class DocScraper {
  addUrls(urls) {
    return Promise.all(urls.map(url => this.scrape(url)))
      .then(values => [].concat(...values))
      ;
  }
  scrape(url) {
    return fetch(url)
      .then(response => response.text())
      .then(text => this._processText(text))
      ;
  }
  _processText(text) {
    let top = {};
    let classes = [];
    let current = top;
    let subCurrent = {};

    function makePragma(object, pragma, content) {
      let p$ = object;
      let p = p$[pragma];
      if (!p) {
        p$[pragma] = p = [];
      }
      p.push(content);
    }

    let js_matches = text.match(/\/\*\*([\s\S]*?)\*\//g) || [];
    text = text.replace(/\/\*\*([\s\S]*?)\*\//g, '');

    let html_matches = text.match(/<!--([\s\S]*?)-->/g) || [];
    let matches = html_matches.concat(js_matches);

    matches.forEach(function(m) {

      let lines = m.replace(/\r\n/g, '\n').replace(/^\s*\/\*\*|^\s*\*\/|^\s*\* ?|^\s*\<\!-\-|^s*\-\-\>/gm, '').split('\n');

      let pragmas = [];
      lines = lines.filter(function(l) {
        let m = l.match(/\s*@([\w-]*) (.*)/);
        if (!m) {
          return true;
        }
        pragmas.push(m);
      });

      let code = lines.join('\n').trim();

      pragmas.forEach(function(m) {
        let pragma = m[1], content = m[2];
        switch (pragma) {

          case 'class':
          case 'element':
            current = {
              name: content,
              description: code
            };
            classes.push(current);
            break;

          case 'attribute':
          case 'method':
          case 'event':
            subCurrent = {
              name: content,
              description: code
            };
            makePragma(current, pragma + 's', subCurrent);
            break;

          case 'default':
          case 'type':
            subCurrent[pragma] = content;
            break;

          case 'name':
            break;

          case 'end':
            current = {};
            break;

          default:
            current[pragma] = content;
            break;
        }
      });
    });
    if (classes.length === 0) {
      classes.push({name: 'no docs', description: '**Undocumented**'});
    }
    return classes;
  }
}

export default DocScraper;
