package arcs.builtinparticles;

import arcs.api.AlertSurface;
import arcs.api.Handle;
import arcs.api.ParticleBase;
import arcs.api.PortableJson;

public class ToastParticle extends ParticleBase {

  private AlertSurface alertSurface;

  public ToastParticle(AlertSurface alertSurface) {
    this.alertSurface = alertSurface;
  }

  @Override
  public void onHandleUpdate(Handle handle, PortableJson update) {
    if ("alert".equals(handle.name) && update.hasKey("added")) {
      update
          .getArray("added")
          .asObjectArray()
          .forEach(entity -> onEntity(entity.getObject("rawData")));
    }
  }

  //  @Override
  public void onEntity(PortableJson entity) {
    alertSurface.alert(entity.getString("message"));
  }
}
