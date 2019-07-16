package arcs.api;

public class Collection extends Handle {
  private final CollectionStore collectionStore;

  public Collection(StorageProxy storage, IdGenerator idGenerator, String name,
      String particleId, boolean canRead, boolean canWrite) {
    super(storage, idGenerator, name, particleId, canRead, canWrite);
    assert storage instanceof CollectionStore : "invalid storage";
    this.collectionStore = (CollectionStore) storage;
  }

  @Override
  public void notify(String kind, Particle particle, PortableJson details) {
    switch (kind) {
      case "sync":
        // TODO: Should return promise?
        particle.onHandleSync(this, details);
        break;
      case "update":
        PortableJson update = jsonParser.emptyObject();
        if (details.hasKey("add")) update.put("added", details.getObject("add"));
        if (details.hasKey("remove")) update.put("removed", details.getObject("remove"));
        update.put("originator", details.getString("originatorId") == this.particleId);
        // TODO: Should return promise?
        particle.onHandleUpdate(this, update);
        break;
      case "desync":
        // TODO: Should return promise?
        particle.onHandleDesync(this);
        break;
      default:
        throw new AssertionError("Unsupported notify kind " + kind + " for particle: " + particle.getName());
    }
  }

  public PortablePromise<PortableJson> get(String id) {
    if (!canRead) {
      throw new AssertionError("Handle not readable");
    }
    return collectionStore.get(id);
  }

  public PortablePromise<PortableJson> toList() {
    if (!canRead) {
      throw new AssertionError("Handle not readable");
    }
    return collectionStore.toList();
  }

  public void store(PortableJson entity) {
    if (!canWrite) {
      throw new AssertionError("Handle not writeable");
    }
    createIdForEntity(entity);
    String keys[] = { generateKey() };
    collectionStore.store(entity, keys, particleId);
  }

  public void clear() {
    if (!canWrite) {
      throw new AssertionError("Handle not writeable");
    }
    collectionStore.clear(particleId);
  }

  public void remove(PortableJson entity) {
    if (!canWrite) {
      throw new AssertionError("Handle not writeable");
    }
    collectionStore.remove(entity.getString("id"), new String[0], particleId);
  }
}
