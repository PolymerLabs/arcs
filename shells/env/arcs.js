const g = (typeof window === 'undefined') ? global : window;

const {
  version,
  Arc,
  Manifest,
  Planificator,
  SlotComposer,
  SlotDomConsumer,
  Type,
  BrowserLoader,
  StorageProviderFactory,
  ParticleExecutionContext,
  RecipeResolver,
  KeyManager,
  firebase,
} = g.__ArcsLib__;

export {
  version,
  Arc,
  Manifest,
  Planificator,
  SlotComposer,
  SlotDomConsumer,
  Type,
  BrowserLoader,
  StorageProviderFactory,
  ParticleExecutionContext,
  RecipeResolver,
  KeyManager,
  firebase
};
