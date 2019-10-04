package arcs.demo.ui;

import arcs.api.PortableJson;
import arcs.api.UiRenderer;
import java.util.logging.Logger;
import javax.inject.Inject;

class LogRenderer implements UiRenderer {

  private static final Logger logger = Logger.getLogger(LogRenderer.class.getName());

  @Inject
  LogRenderer() {}

  @Override
  public boolean render(PortableJson content) {
    if (content.hasKey("data") && content.getObject("data").hasKey("template")) {
      logger.warning("LogRenderer: " + content.getObject("data").getString("template"));
      return true;
    }
    return false;
  }
}
