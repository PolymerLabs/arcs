// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

'use strict';

defineParticle(({DomParticle, html, log}) => {

  const template = html`
    <aframe-html id={{subId}} anchor="center" height="1" width="2" position="0 1 0" html="{{pr}}"></aframe-html>
  `.trim();

  let githubIds = {
    'Scott': 'sjmiles',
    'Shane': 'shans',
    'Doug': 'dstockwell',
    'Berni': 'bseefeld',
    'Noe': 'shaper',
    'Mike': 'smalls'
  };

  const service = `https://xenonjs.com/services/http/php/github.php`;

  return class extends DomParticle {
    get template() {
      return template;
    }
    render({participants}, {prs, issues}) {
      if (!prs) {
        this.fetchPRs();
      }
      if (!issues) {
        //this.fetchIssues();
      }
      return {
        items: Object.keys(githubIds).map(name => {
          const githubAccount = githubIds[name];

          const last = prs && prs.find(pr => pr.user.login === githubAccount);
          if (!last) return {};

          const reviewers = last.requested_reviewers && last.requested_reviewers.length
            ? `• reviews requested from ${last.requested_reviewers.map(r => r.login)}` : '';

          const content = html`
            <div style="background: #F8F8F8; color: #333; font-size: 24px; padding: 32px; border-radius: 16px;">
              <div style="font-size: 1.3em; margin-bottom: 16px;">${last.title}</div>
              <div style="color: gray;">#${last.number} ${reviewers}</div>
            </div>
          `;

          return {
            subId: name,
            pr: content
          };
        })
      };
    }
    async fetchPRs() {
      const response = await fetch(`${service}/repos/PolymerLabs/arcs/pulls`);
      const prs = await response.json();
      this.setState({prs});
    }
  };

});