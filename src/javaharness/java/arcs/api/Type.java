package arcs.api;

public class Type {
    public final String tag;
    // TODO: add more fields.

    public Type(String tag) {
        this.tag = tag;
    }

    public boolean isCollection() {
        return this.tag == "Collection";
    }
    public static Type fromJson(PortableJson json) {
        return new Type(json.getString("tag"));
    }
}
