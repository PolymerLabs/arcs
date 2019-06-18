package arcs.api;

public class SingletonProxy extends StorageProxy implements SingletonStore {
  public SingletonProxy(String id, Type type, PECInnerPort port, String name) {
    super(id, type, port, name);
  }

  // TODO: add parameters and return values, and implement.
  @Override
  public void get() {}

  @Override
  public void set() {}

  @Override
  public void clear() {}
}
