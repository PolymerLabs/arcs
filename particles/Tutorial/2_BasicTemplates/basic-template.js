defineParticle(({DomParticle, html}) => {   
  return class extends DomParticle {
    get template() {
      // You can set placeholders in your template like so: {{name}}. The render function is where these placeholders are overridden.
      // NOTE: Each placeholder needs to be enclosed inside its own HTML element (here, a <span>).
      return html`<b>Hello, <span>{{name}}</span>!</b>`;
    }

    render() {
      // Returns a dictionary, mapping from placeholder name to value.
      return {name: 'Human'};
    }
  };
});
