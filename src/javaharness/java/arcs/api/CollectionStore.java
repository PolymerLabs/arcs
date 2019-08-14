package arcs.api;

public interface CollectionStore extends Store {
  PortablePromise<PortableJson> get(String id);

  void store(PortableJson value, String keys[], String particleId);

  void clear(String particleId);

  void remove(String id, String keys[], String particleId);

  PortablePromise<PortableJson> toList();
}
