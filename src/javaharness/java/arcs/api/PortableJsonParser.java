package arcs.api;

/**
 * Portable JSON parser that works on either JS or Android environment.
 */
public interface PortableJsonParser {
    PortableJson parse(String json);
    PortableJson emptyJson();
    String stringify(PortableJson json);
}
