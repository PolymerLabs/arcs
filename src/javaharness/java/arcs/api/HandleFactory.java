package arcs.api;

public interface HandleFactory {
  Handle handleFor(
      StorageProxy storage,
      IdGenerator idGenerator,
      String name,
      String particleId,
      boolean isInput,
      boolean isOutput);
}
