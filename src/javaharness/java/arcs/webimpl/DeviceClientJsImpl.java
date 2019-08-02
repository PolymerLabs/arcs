package arcs.webimpl;

import arcs.api.ArcsEnvironment;
import arcs.api.DeviceClientImpl;
import arcs.api.PortableJsonParser;
import arcs.api.PECInnerPortFactory;
import jsinterop.annotations.JsType;

import javax.inject.Inject;
import java.util.Map;

import static elemental2.dom.DomGlobal.window;

@JsType(namespace = "arcs")
public class DeviceClientJsImpl extends DeviceClientImpl {
    @Inject
    public DeviceClientJsImpl(PortableJsonParser jsonParser,
                              Map<String, ArcsEnvironment.DataListener> inProgress,
                              PECInnerPortFactory portFactory) {
        super(jsonParser, inProgress, portFactory);
    }

    @Override
    public void receive(String json) {
        super.receive(json);
    }
}
