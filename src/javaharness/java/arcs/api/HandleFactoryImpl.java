package arcs.api;

import javax.inject.Inject;

public class HandleFactoryImpl implements HandleFactory {
    @Inject
    HandleFactoryImpl() {}

    @Override
    public Handle handleFor(StorageProxy storage, String name, boolean isInput, boolean isOutput) {
        if (storage.type.isCollection()) {
            return new Collection(storage, name, isInput, isOutput);
        } else {
            return new Singleton(storage, name, isInput, isOutput);
        }
    }
}
