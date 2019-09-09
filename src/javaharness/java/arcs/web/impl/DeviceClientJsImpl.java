package arcs.web.impl;

import arcs.api.ArcsEnvironment;
import arcs.api.DeviceClientImpl;
import arcs.api.PECInnerPortFactory;
import arcs.api.PortableJsonParser;
import arcs.api.UiBroker;
import arcs.api.UiRenderer;
import java.util.Map;
import javax.inject.Inject;
import jsinterop.annotations.JsType;

@JsType(namespace = "arcs")
public class DeviceClientJsImpl extends DeviceClientImpl {
  @Inject
  public DeviceClientJsImpl(
      PortableJsonParser jsonParser,
      Map<String, ArcsEnvironment.DataListener> inProgress,
      PECInnerPortFactory portFactory,
      UiBroker uiBroker) {
    super(jsonParser, inProgress, portFactory, uiBroker);
  }

  @Override
  public void receive(String json) {
    super.receive(json);
  }
}
