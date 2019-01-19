const g = (typeof window === 'undefined') ? global : window;

const {
  version,
  Arc,
  Manifest,
  Modality,
  ModalityHandler,
  Planificator,
  Suggestion,
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
  logFactory,
  Xen,
} = g.__ArcsLib__;

// TODO(sjmiles): populated dynamically via env-base.js
const Env = {};

export {
  version,
  Arc,
  Manifest,
  Modality,
  ModalityHandler,
  Planificator,
  Suggestion,
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
  logFactory,
  Xen,
  Env
};
