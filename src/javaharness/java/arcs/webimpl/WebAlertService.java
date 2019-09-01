package arcs.webimpl;

import arcs.api.AlertService;
import javax.inject.Inject;
import jsinterop.annotations.JsMethod;

public class WebAlertService implements AlertService {

  @Inject
  public WebAlertService() {
  }

  @Override
  public void alert(String msg) {
    alert0(msg);
  }

  @JsMethod(namespace="<window>", name = "alert")
  private static native void alert0(String msg);
}
