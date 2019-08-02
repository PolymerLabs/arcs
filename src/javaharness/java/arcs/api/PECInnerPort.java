package arcs.api;

import java.util.function.Consumer;

public interface PECInnerPort {
  void handleMessage(PortableJson message);

  void InitializeProxy(StorageProxy storageProxy, Consumer<PortableJson> callback);
  void SynchronizeProxy(StorageProxy storageProxy, Consumer<PortableJson> callback);

  void HandleStore(StorageProxy storageProxy, Consumer<PortableJson> callback, PortableJson data, String particleId);
  void HandleToList(StorageProxy storageProxy, Consumer<PortableJson> callback);
  void HandleRemove(StorageProxy storageProxy, Consumer<PortableJson> callback, PortableJson data, String particleId);
  void HandleRemoveMultiple(StorageProxy storageProxy, Consumer<PortableJson> callback, PortableJson data, String particleId);

  void Render(Particle particle, String slotName, PortableJson content);

  // TODO: add more methods.
}
