package arcs.api;

public class CollectionProxy extends StorageProxy implements CollectionStore {
  public CollectionProxy(String id, Type type, PECInnerPort port, String name) {
    super(id, type, port, name);
  }

  // TODO: add parameters and return values, and implement.
  @Override
  public void get() {}

  @Override
  public void store() {}

  @Override
  public void clear() {}

  @Override
  public void remove() {}

  @Override
  public void toList() {}
}
