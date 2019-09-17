package arcs.api;

import java.util.function.Consumer;

public interface PECInnerPort {
  void processMessage(PortableJson message);

  void mapParticle(Particle particle);

  void initializeProxy(StorageProxy storageProxy, Consumer<PortableJson> callback);

  void synchronizeProxy(StorageProxy storageProxy, Consumer<PortableJson> callback);

  void handleStore(
      StorageProxy storageProxy,
      Consumer<PortableJson> callback,
      PortableJson data,
      String particleId);

  void handleToList(StorageProxy storageProxy, Consumer<PortableJson> callback);

  void handleRemove(
      StorageProxy storageProxy,
      Consumer<PortableJson> callback,
      PortableJson data,
      String particleId);

  void handleRemoveMultiple(
      StorageProxy storageProxy,
      Consumer<PortableJson> callback,
      PortableJson data,
      String particleId);

  void output(Particle particle, PortableJson content);
}
