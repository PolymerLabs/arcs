package arcs.api;

import javax.inject.Inject;

public class StorageProxyFactoryImpl implements StorageProxyFactory {
    private final PECInnerPort port;

    @Inject
    StorageProxyFactoryImpl(PECInnerPort port) {
        this.port = port;
    }

    public StorageProxy newProxy(String id, Type type, String name) {
        if (type.isCollection()) {
            return new CollectionProxy(id, type, this.port, name);
        }
        return new SingletonProxy(id, type, this.port, name);
    }
}
