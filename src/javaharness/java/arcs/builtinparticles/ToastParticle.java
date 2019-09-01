package arcs.builtinparticles;

import arcs.api.AlertService;
import arcs.api.Handle;
import arcs.api.ParticleBase;
import arcs.api.PortableJson;

public class ToastParticle extends ParticleBase {

  private AlertService alertService;

  public ToastParticle(AlertService alertService) {
    this.alertService = alertService;
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
    alertService.alert(entity.getString("message"));
  }
}
