package arcs.api;

public class TypeFactory {
    public static Type typeFromJson(PortableJson json) {
        Type.Tag tag = Type.Tag.fromString(json.getString("tag"));
        PortableJson data = json.getObject("data");
        switch (tag) {
            case ENTITY:
                return new EntityType(Schema.fromJson(data));
            case COLLECTION:
                return new CollectionType<>(TypeFactory.typeFromJson(data));
            default:
                throw new AssertionError("Unsupported type tag " + tag);
        }
    }
}
