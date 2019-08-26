package arcs.impl;

import android.util.Log;
import android.webkit.JavascriptInterface;
import arcs.api.ArcsEnvironment.DataListener;
import arcs.api.DeviceClientImpl;
import arcs.api.PECInnerPortFactory;
import arcs.api.PortableJsonParser;
import java.util.Map;
import javax.inject.Inject;

public class DeviceClientAndroidImpl extends DeviceClientImpl {

  @Inject
  public DeviceClientAndroidImpl(
      PortableJsonParser jsonParser,
      Map<String, DataListener> inProgress,
      PECInnerPortFactory portFactory) {
    super(jsonParser, inProgress, portFactory);
  }

  @JavascriptInterface
  @Override
  public void receive(String json) {
    try {
      super.receive(json);
    } catch (Throwable e) {
      Log.e("Arcs", "Got an excepton receiving " + json, e);
    }
  }
}
