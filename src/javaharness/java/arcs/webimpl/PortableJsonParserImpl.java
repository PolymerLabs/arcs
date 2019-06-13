package arcs.webimpl;

import arcs.api.PortableJson;
import arcs.api.PortableJsonParser;
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
        return JSON.stringify(Js.asAny(json));
    }
}
