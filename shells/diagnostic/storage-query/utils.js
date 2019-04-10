export const listenToStore = (store, onchange) => {
  // observe changes
  store.on('change', onchange, store);
  // record ability to stop observation
  return () => store.off(onchange);
};

export const forEachEntity = async (store, fn) => {
  const data = store.toList ? await store.toList() : [await store.get()];
  data.forEach(value => value && fn(value));
};

export const nameOfType = type => {
  let typeName = type.getEntitySchema().names[0];
  if (type.isCollection) {
    typeName = `[${typeName}]`;
  }
  return typeName;
};

export const simpleNameOfType = type => type.getEntitySchema().names[0];

export const getBoxTypeSpec = store => {
  return store.type.getEntitySchema().type.toString();
};

export const boxes = {};
