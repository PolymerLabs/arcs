package arcs.webimpl;

import arcs.api.AlertSurface;
import javax.inject.Inject;
import jsinterop.annotations.JsMethod;

public class WebAlertSurface implements AlertSurface {

  @Inject
  public WebAlertSurface() {
  }

  @Override
  public void alert(String msg) {
    alert0(msg);
  }

  @JsMethod(namespace="<window>", name = "alert")
  private static native void alert0(String msg);
}
