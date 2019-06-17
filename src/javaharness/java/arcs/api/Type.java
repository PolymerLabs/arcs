package arcs.api;

public class Type {
    enum Tag {
        UNKNOWN, ENTITY, COLLECTION;
        public boolean isCollection() {
            return this == COLLECTION;
        }
        public boolean isEntity() {
            return this == ENTITY;
        }
        static Tag fromString(String tag) {
            switch (tag) {
                case "Collection": return Tag.COLLECTION;
                case "Entity": return Tag.ENTITY;
                default: return UNKNOWN;
            }
        }
    }

    public final Tag tag;

    public Type(Tag tag) {
        this.tag = tag;
    }

    public boolean isCollection() {
        return this.tag.isCollection();
    }

    public boolean isEntity() {
        return this.tag.isEntity();
    }

    public static Type fromJson(PortableJson json) {
        return new Type(Tag.fromString(json.getString("tag")));
    }
}
