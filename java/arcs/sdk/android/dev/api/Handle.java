package arcs.sdk.android.dev.api;

import arcs.core.common.Id;

public abstract class Handle {
  public StorageProxy storage;
  private final Id.Generator idGenerator;
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

  protected Handle(
      StorageProxy storage,
      Id.Generator idGenerator,
      String name,
      String particleId,
      boolean canRead,
      boolean canWrite) {
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
    return Id.Companion.fromString(this.storage.id);
  }

  protected String generateKey() {
    return idGenerator.newChildId(getId(), "key").toString();
  }

  protected void createIdForEntity(PortableJson entity) {
    if (!entity.hasKey("id")) {
      entity.put("id", idGenerator.newChildId(getId(), /* subComponent= */ "").toString());
    }
  }

  abstract void notify(String kind, Particle particle, PortableJson details);
}
