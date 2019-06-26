package arcs.api;

public class SingletonProxy extends StorageProxy implements SingletonStore {
  public SingletonProxy(String id, Type type, PECInnerPort port, String name) {
    super(id, type, port, name);
  }

  @Override
  protected boolean synchronizeModel(int version, PortableJson model) {
    // TODO: implement
    throw new AssertionError("SingletonProxy::updateModel not implemented");
  }

  @Override
  protected boolean updateModel(int version, PortableJson data) {
    // TODO: implement
    throw new AssertionError("SingletonProxy::updateModel not implemented");
  }

  // TODO: add parameters and return values, and implement.
  @Override
  public void get() {}

  @Override
  public void set() {}

  @Override
  public void clear() {}
}
