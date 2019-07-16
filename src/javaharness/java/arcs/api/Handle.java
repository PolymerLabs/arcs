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
  protected PortableJsonParser jsonParser;

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
    this.jsonParser = storage.jsonParser;
  }

  public Id getId() {
    return Id.fromString(this.storage.id);
  }

  protected String generateKey() {
    return idGenerator.newChildId(getId(), "key").toString();
  }

  protected void createIdForEntity(PortableJson entity) {
    if (!entity.hasKey("id")) {
      entity.put("id", idGenerator.newChildId(getId(), /* subcomponent= */ "").toString());
    }
  }

  abstract void notify(String kind, Particle particle, PortableJson details);
}
