package arcs.api;

public abstract class Handle {
  public StorageProxy storage;
  public String name;
  public boolean canRead;
  public boolean canWrite;
  public String particleId;
  Type type;
  Options options = new Options();
  // TODO: add EntityClass and other fields.

  public static class Options {
    public boolean keepSynced = true;
    public boolean notifySync = true;
    public boolean notifyUpdate = true;
    public boolean notifyDesync = false;
  }

  protected Handle(StorageProxy storage, String name, boolean canRead, boolean canWrite) {
    this.storage = storage;
    this.name = name;
    this.type = storage.type;
    this.canRead = canRead;
    this.canWrite = canWrite;
  }

  abstract void notify(String kind, Particle particle, PortableJson details);
}
