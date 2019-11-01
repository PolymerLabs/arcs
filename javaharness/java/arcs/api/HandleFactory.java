package arcs.api;

import javax.inject.Inject;

@javax.inject.Singleton
public class HandleFactory {

  @Inject
  HandleFactory() {}

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
