defineParticle(({DomParticle, html, log}) => {

  const template = html`
  <style>
  .grid {
    display: grid;
    grid-template-rows: 1fr 1fr 1fr;
    grid-template-columns: 1fr 1fr 1fr;
    grid-gap: 2vw; 
  }

  .grid div {
    background: green;
    padding: 1em;
    @width: 30px;
  }
  </style>
  <div>
    <div>Boardy!!</div>
    <div class='grid'>
    <div>{{p00}}</div><div>{{p01}}</div><div>{{p02}}</div>
    <div>{{p10}}</div><div>{{p11}}</div><div>{{p12}}</div>
    <div>{{p20}}</div><div>{{p21}}</div><div>{{p22}}</div>
    </div>
  </div>`;

  return class extends DomParticle {
    get template() {
      return template;
    }

    shouldRender() {
      return true;
    }

    render({board}) {
      if (board == undefined) {
        return {};
      }
      return {p00: "" + board.p00, p01: "" + board.p01, p02: "" + board.p02,
              p10: "" + board.p10, p11: "" + board.p11, p12: "" + board.p12,
              p20: "" + board.p20, p21: "" + board.p21, p22: "" + board.p22};
    }
  }
});