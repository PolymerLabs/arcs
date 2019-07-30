package arcs.api;

public class StorageProxyFactory {
    static StorageProxy newProxy(String id, Type type, String name, PECInnerPort port) {
        if (type.isCollection()) {
            return new CollectionProxy(id, type, port, name);
        }
        // TODO: Uncomment when SingletonProxy is implemented.
        // return new SingletonProxy(id, type, port, name);
        throw new AssertionError("SingletonProxy not yet supported in Java.");
    }
}
