defineParticle(({DomParticle, html}) => {
  return class extends DomParticle {
    get template() {
      // The parent particle needs to provide a div with slotid "mySlot". This is where the child particle will be rendered.
      return html`
        <b>Hello:</b>
        <div slotid="mySlot"></div>
      `;
    }
  };
});
