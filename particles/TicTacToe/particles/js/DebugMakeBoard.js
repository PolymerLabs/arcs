

defineParticle(({Particle, html, log}) => {

  return class extends Particle {
    async setHandles(handles) {
      const boardHandle = handles.get('board');
      const boardEntity = new boardHandle.entityClass({p00: 0, p01: 1, p02: 2, p10: 1, p11: 2, p12: 0, p20: 2, p21: 0, p22: 1});
      // console.log(boardHandle);
      await boardHandle.set(boardEntity);
      // console.log('woo');
    }
  };
});
