'use strict';

 /* global defineParticle */

 defineParticle(({DomParticle, html, log}) => {
  const template = html`
 <div style="padding: 8px;">
  Captain's log, stardate <b>{{stardate}}</b>.
  Our destination is <b>{{destination}}</b>.
</div>
   `;

   return class extends DomParticle {
    get template() {
      return template;
    }
    render({stardate, destination}, state) {
      if (stardate && destination) {
        return {
          stardate: stardate.date,
          destination: destination.name
        };
      }
    }
  };
});
