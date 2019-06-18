package arcs.api;

public interface HandleFactory {
  Handle handleFor(StorageProxy storage, String name, boolean isInput, boolean isOutput);
}
