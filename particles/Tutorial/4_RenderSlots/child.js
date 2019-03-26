defineParticle(({DomParticle, html}) => {
  return class extends DomParticle {
    get template() {
      return html`Child`;
    }
  };
});
