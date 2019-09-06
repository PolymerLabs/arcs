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
  public void render(PortableJson content) {
    logger.warning("LogRenderer: " + content.getObject("data").getString("template"));
  } 
}
