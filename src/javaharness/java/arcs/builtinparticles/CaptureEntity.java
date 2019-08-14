package arcs.builtinparticles;

import arcs.api.Collection;
import arcs.api.ParticleBase;
import arcs.api.PortableJson;

public class CaptureEntity extends ParticleBase implements EntityObserver.Listener {

  public CaptureEntity(EntityObserver entityObserver) {
    entityObserver.registerListener(this);
  }

  @Override
  public void onEntity(PortableJson entity) {
      if (!entity.hasKey("type") || entity.getString("type") == null) {
        throw new AssertionError("Incoming entity missing `type`");
      }
      if (!entity.hasKey("source") || entity.getString("source") == null) {
        throw new AssertionError("Incoming entity missing `source`");
      }
      if (!entity.hasKey("jsonData") || entity.getObject("jsonData") == null) {
        throw new AssertionError("Incoming entity missing serialized `jsonData`");
      }

      ((Collection) getHandle("entities")).store(jsonParser.emptyObject().put("rawData", entity));
  }
}
