package arcs.api;

import java.util.concurrent.CompletableFuture;

interface CollectionStore extends Store {
  CompletableFuture<PortableJson> get(String id);

  void store(PortableJson value, String[] keys, String particleId);

  void clear(String particleId);

  void remove(String id, String[] keys, String particleId);

  CompletableFuture<PortableJson> toList();
}
