const g = (typeof window === 'undefined') ? global : window;

const {
  version,
  Arc,
  Manifest,
  Planificator,
  SlotComposer,
  SlotDomConsumer,
  Type,
  ArcType,
  BrowserLoader,
  StorageProviderFactory,
  ParticleExecutionContext,
  RecipeResolver,
  KeyManager,
  firebase,
  Xen
} = g.__ArcsLib__;

export {
  version,
  Arc,
  Manifest,
  Planificator,
  SlotComposer,
  SlotDomConsumer,
  Type,
  ArcType,
  BrowserLoader,
  StorageProviderFactory,
  ParticleExecutionContext,
  RecipeResolver,
  KeyManager,
  firebase,
  Xen
};
