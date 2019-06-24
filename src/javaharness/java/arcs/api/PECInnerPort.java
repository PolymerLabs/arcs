package arcs.api;

public interface PECInnerPort {
  void handleMessage(PortableJson message);
  void InitializeProxy(StorageProxy storageProxy);
  void SynchronizeProxy(StorageProxy storageProxy);
  // TODO: add more methods.
}
