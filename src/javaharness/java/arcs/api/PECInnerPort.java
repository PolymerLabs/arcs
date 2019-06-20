package arcs.api;

import java.util.function.Function;

public interface PECInnerPort {
  void handleMessage(PortableJson message);
  void InitializeProxy(StorageProxy storageProxy, Function<PortableJson, Void> callback);
  void SynchronizeProxy(StorageProxy storageProxy, Function<PortableJson, Void> callback);
  // TODO: add more methods.
}
