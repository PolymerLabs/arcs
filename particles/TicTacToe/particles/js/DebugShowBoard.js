defineParticle(({DomParticle, html, log}) => {

  const template = html`
  <div>
    Boardy!!
    <div>{{p00}}</div><div>{{p01}}</div><div>{{p02}}</div>
    <div>{{p10}}</div><div>{{p11}}</div><div>{{p12}}</div>
    <div>{{p20}}</div><div>{{p21}}</div><div>{{p22}}</div>
  </div>`;

  return class extends DomParticle {
    get template() {
      return template;
    }

    shouldRender() {
      return true;
    }

    render(a, b) {
      console.log(a, b);
      return {p00: 1};
    }
  }
});