defineParticle(({SimpleParticle, html, log}) => {
  return class extends SimpleParticle {
    get template() {
      log(`Add '?log' to the URL to enable particle logging`);
      return html`<span>{{num}}</span> : <span>{{str}}</span>`;
    }
    render({data}) {
      return {num: 42, str: 'Universe, et al'};
    }
  };
});
