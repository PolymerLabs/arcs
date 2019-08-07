package arcs.api;

public abstract class Handle {
  public StorageProxy storage;
  private final IdGenerator idGenerator;
  public String name;
  public boolean canRead;
  public boolean canWrite;
  public String particleId;
  Type type;
  Options options = new Options();

  public static class Options {
    public boolean keepSynced = true;
    public boolean notifySync = true;
    public boolean notifyUpdate = true;
    public boolean notifyDesync = false;
  }

  protected Handle(StorageProxy storage, IdGenerator idGenerator, String name,
      String particleId, boolean canRead, boolean canWrite) {
    this.storage = storage;
    this.type = storage.type;
    this.idGenerator = idGenerator;
    this.name = name;
    this.particleId = particleId;
    this.canRead = canRead;
    this.canWrite = canWrite;
  }

  protected String generateKey() {
    return idGenerator.newChildId(Id.fromString(this.storage.id), "key").toString();
  }

  abstract void notify(String kind, Particle particle, PortableJson details);
}
