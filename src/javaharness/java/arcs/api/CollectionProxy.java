package arcs.api;

public class CollectionProxy extends StorageProxy implements CollectionStore {
  PortableJson model;  // TODO: replace with crdt model class.

  public CollectionProxy(String id, Type type, PECInnerPort port, String name,
      PortableJsonParser jsonParser, PortablePromiseFactory promiseFactory) {
    super(id, type, port, name, jsonParser, promiseFactory);
  }

  @Override
  protected boolean synchronizeModel(int version, PortableJson model) {
    this.version = Integer.valueOf(version);
    this.model = model;
    return true;
  }

  @Override
  protected boolean updateModel(int version, PortableJson data) {
    if (data.hasKey("add")) {
      ((CollectionProxy) this).store(data.getObject("add"));
    } else {
      // TODO: support other updates.
      throw new AssertionError("Unsupported StorageProxy update");
    }
    return true;
  }

  // TODO: add parameters and return values, and implement.
  @Override
  public void get() {
    throw new AssertionError("CollectionProxy::get not implemented");
  }

  @Override
  public void store(PortableJson add) {
    for (int i = 0; i < add.getLength(); ++i) {
      model.put(model.getLength(), add.getObject(i));
    }
  }

  @Override
  public void clear() {
    throw new AssertionError("CollectionProxy::clear not implemented");
  }

  @Override
  public void remove() {
    throw new AssertionError("CollectionProxy::remove not implemented");
  }

  @Override
  public PortableJson toList() {
    return model;
  }
}
