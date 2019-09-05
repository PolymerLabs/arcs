package arcs.android.impl;

import android.webkit.WebView;
import arcs.api.ArcsEnvironment;
import arcs.api.DeviceClient;
import arcs.api.HarnessController;
import javax.inject.Inject;

public class AndroidHarnessController implements HarnessController {

  private ArcsEnvironment environment;
  private DeviceClient deviceClient;
  private WebView webView;

  @Inject
  AndroidHarnessController(ArcsEnvironment environment, DeviceClient deviceClient) {
    this.environment = environment;
    this.deviceClient = deviceClient;
  }

  @Override
  public void init() {
    exportDeviceClient();
  }

  public void init(WebView webView) {
    this.webView = webView;
    exportDeviceClient();
  }

  private void exportDeviceClient() {
    if (webView != null) {
      webView.addJavascriptInterface(deviceClient, "DeviceClient");
    }
  }
}
