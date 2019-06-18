package arcs.api;

public abstract class Handle {
  public StorageProxy storage;
  public String name;
  public boolean canRead;
  public boolean canWrite;
  public String particleId;
  Type type;
  // TODO: add EntityClass and other fields.

  protected Handle(StorageProxy storage, String name, boolean canRead, boolean canWrite) {
    this.storage = storage;
    this.name = name;
    this.type = storage.type;
    this.canRead = canRead;
    this.canWrite = canWrite;
  }
}
