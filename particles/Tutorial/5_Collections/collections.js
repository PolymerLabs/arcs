defineParticle(({DomParticle, html}) => {   
  return class extends DomParticle {
    get template() {
      // TODO: Update this tutorial to show how to output a list of things in a template.
      return html`Hello <span>{{allNames}}</span>. Your combined age is <span>{{totalAge}}</span>.`;
    }

    shouldRender(props) {
      return props && props.inputData;
    }

    // inputData is a list of PersonDetails objects. We concatenate all the names together, and sum all the ages.
    render({inputData}) {
      let allNames = '';
      let totalAge = 0;
      inputData.forEach(({name, age}, index) => {
        if (index != 0) {
          allNames += ', ';
        }
        allNames += name;
        totalAge += age;
      });
      return {allNames, totalAge};
    }
  };
});
