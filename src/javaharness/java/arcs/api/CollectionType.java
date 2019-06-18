package arcs.api;

public class CollectionType<T extends Type> extends Type {
    public final T collectionType;

    public CollectionType(T collectionType) {
        super(Type.Tag.COLLECTION);
        this.collectionType = collectionType;
    }

    @Override
    public Schema getEntitySchema() {
        if (collectionType.isEntity()) {
            return collectionType.getEntitySchema();
        }
        return null;
    }
}
