package arcs.demo.particles;

import arcs.api.Collection;
import arcs.api.Handle;
import arcs.api.ParticleBase;
import arcs.api.PortableJson;
import arcs.api.PortableJsonParser;
import java.util.List;
import java.util.Map;
import java.util.function.Consumer;

public class RenderText extends ParticleBase {

  private PortableJsonParser parser;

  public RenderText(PortableJsonParser parser) {
    this.parser = parser;
  }

  @Override
  public void setHandles(Map<String, Handle> handleByName) {
    super.setHandles(handleByName);
    this.output();
  }

  @Override
  public void setOutput(Consumer<PortableJson> output) {
    super.setOutput(output);
    this.output();
  }

  @Override
  public String getTemplate(String slotName) {
    return "Hello world!";
  }
}
