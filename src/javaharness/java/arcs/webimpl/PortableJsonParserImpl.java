package arcs.webimpl;

import arcs.api.PortableJson;
import arcs.api.PortableJsonParser;
import java.util.Collection;
import jsinterop.annotations.JsType;
import jsinterop.base.Any;
import jsinterop.base.Js;

import javax.inject.Inject;

public class PortableJsonParserImpl implements PortableJsonParser {
    @Inject
    public PortableJsonParserImpl() {
    }

    @JsType(isNative = true, namespace = "<window>")
    static class JSON {
        static native Any parse(String json);
        static native String stringify(Any obj);
    }

    @Override
    public PortableJson parse(String json) {
        return new PortableJsonJsImpl(JSON.parse(json));
    }

    @Override
    public String stringify(PortableJson json) {
        return JSON.stringify(((PortableJsonJsImpl) json).getRawObj());
    }

    @Override
    public PortableJson emptyObject() {
        return parse("{}");
    }

    @Override
    public PortableJson emptyArray() {
        return parse("[]");
    }

    @Override
    public PortableJson fromStringArray(Collection<String> collection) {
        PortableJson json = emptyArray();
        collection.forEach(str -> json.put(json.getLength(), str));
        return json;
    }

    @Override
    public PortableJson fromObjectArray(Collection<PortableJson> collection) {
        PortableJson json = emptyArray();
        collection.forEach(obj -> json.put(json.getLength(), obj));
        return json;
    }

}
