package arcs.api;

public class StorageProxyFactory {
    static StorageProxy newProxy(String id, Type type, String name, PECInnerPort port) {
        if (type.isCollection()) {
            return new CollectionProxy(id, type, port, name);
        }
        return new SingletonProxy(id, type, port, name);
    }
}
