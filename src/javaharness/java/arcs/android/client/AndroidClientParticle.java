package arcs.android.client;

import arcs.api.ParticleBase;

/**
 * Base class for an Android particle which does not live inside the Arcs service. That is, it is
 * running somewhere else, and needs to communicate with Arcs via the {@link ArcsServiceBridge}.
 */
public class AndroidClientParticle extends ParticleBase {

  private final ArcsServiceBridge arcsServiceBridge;

  public AndroidClientParticle(ArcsServiceBridge arcsServiceBridge) {
    this.arcsServiceBridge = arcsServiceBridge;
  }

  public void startArc() {
    // TODO: This should be a separate method on IArcsService for starting new arcs.
    arcsServiceBridge.sendMessageToArcs("TODO: START ARC WITH PARTICLE HERE", null);
  }
}
