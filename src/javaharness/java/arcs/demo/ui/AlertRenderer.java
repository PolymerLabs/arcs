package arcs.demo.ui;

import arcs.api.PortableJson;
import arcs.api.UiRenderer;
import arcs.demo.services.AlertService;
import java.util.logging.Logger;
import javax.inject.Inject;

class AlertRenderer implements UiRenderer {

  private final AlertService alertService;

  @Inject
  AlertRenderer(AlertService alertService) {
    this.alertService = alertService;
  }

  @Override
  public boolean render(PortableJson content) {
    if (content.hasKey("data") && content.getObject("data").hasKey("template")) {
      alertService.alert(content.getObject("data").getString("template"));
      return true;
    }
    return false;
  }
}
