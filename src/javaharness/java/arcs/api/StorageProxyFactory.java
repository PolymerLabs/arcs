package arcs.api;

public interface StorageProxyFactory {
    StorageProxy newProxy(String id, Type type, String name);
}
