package arcs.api;

import android.util.Log;

import javax.inject.Inject;

@javax.inject.Singleton
class HandleFactory {

  @Inject
  HandleFactory() {
    Log.d("Arcs", "handle factory + " + this);
  }

  public Handle handleFor(
    StorageProxy storage,
    IdGenerator idGenerator,
    String name,
    String particleId,
    boolean isInput,
    boolean isOutput) {
    if (storage.type.isCollection()) {
      return new Collection(storage, idGenerator, name, particleId, isInput, isOutput);
    } else {
      return new Singleton(storage, idGenerator, name, particleId, isInput, isOutput);
    }
  }
}
