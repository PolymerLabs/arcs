// The JavaScript code for the Hello World particle. This is mostly boilerplate for defining a new particle using the DomParticle library, which
// is how particles that render to the DOM are defined.
defineParticle(({DomParticle, html}) => {
  return class extends DomParticle {
    // Getter function which returns static HTML to display. In later tutorials we'll see how to use the templating functionality this provides.
    get template() {
      // You can use the html helper like so to render HTML:
      return html`<b>Hello, world!</b>`;
    }
  };
});
