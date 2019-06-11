package arcs.api;

public abstract class StorageProxy implements Store {
  public final String id;
  String name;
  Type type;
  PECInnerPort port;

  protected StorageProxy(String id, Type type, PECInnerPort port, String name) {
      this.id = id;
      this.port = port;
      this.type = type;
      this.name = name;
  }

  public void register(NativeParticle particle, Handle handle) {
    if (!handle.canRead) {
      return;
    }
    this.port.InitializeProxy(this);

    // TODO: finish implementation.
  }
}
