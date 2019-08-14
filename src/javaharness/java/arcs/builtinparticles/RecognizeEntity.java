package arcs.builtinparticles;

import arcs.api.Collection;
import arcs.api.ParticleBase;
import arcs.api.PortableJson;
import java.util.function.Function;

public class RecognizeEntity extends ParticleBase implements Function<PortableJson, String> {
  @Override
  public String apply(PortableJson json) {
      if (!json.hasKey("type") || json.getString("type") == null) {
        throw new AssertionError("Incoming entity missing `type`");
      }
      if (!json.hasKey("source") || json.getString("source") == null) {
        throw new AssertionError("Incoming entity missing `source`");
      }
      if (!json.hasKey("jsonData") || json.getObject("jsonData") == null) {
        throw new AssertionError("Incoming entity missing serialized `jsonData`");
      }

      ((Collection) getHandle("entities")).store(jsonParser.emptyObject().put("rawData", json));
      return null;
  }
}
