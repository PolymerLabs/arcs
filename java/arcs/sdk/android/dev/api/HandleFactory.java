package arcs.sdk.android.dev.api;

import arcs.core.common.Id;
import javax.inject.Inject;

@javax.inject.Singleton
public class HandleFactory {

  @Inject
  HandleFactory() {}

  public Handle handleFor(
    StorageProxy storage,
    Id.Generator idGenerator,
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
