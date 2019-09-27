package arcs.api;

import javax.inject.Inject;

public abstract class ArcsImpl implements Arcs {

  @Inject protected PortableJsonParser jsonParser;
  @Inject protected UiBroker uiBroker;
  protected final IdGenerator idGenerator = IdGenerator.newSession();

  @Override
  public Arc runArc(String recipe) {
    Arc arc = new Arc.Builder().setRecipe(recipe).get();
    runArc(arc);
    return arc;
  }

  @Override
  public Arc runArc(String recipe, Particle particle) {
    Arc arc = new Arc.Builder().setRecipe(recipe).setParticle(particle).get();
    runArc(arc);
    return arc;
  }

  @Override
  public Arc runArc(String recipe, String arcId, String pecId) {
    Arc arc = new Arc.Builder().setRecipe(recipe).setArcId(arcId).setPecId(pecId).get();
    runArc(arc);
    return arc;
  }

  @Override
  public Arc runArc(String recipe, String arcId, String pecId, Particle particle) {
    Arc arc =
        new Arc.Builder()
            .setRecipe(recipe)
            .setArcId(arcId)
            .setPecId(pecId)
            .setParticle(particle)
            .get();
    runArc(arc);
    return arc;
  }

  @Override
  public void registerRenderer(String modality, UiRenderer renderer) {
    uiBroker.registerRenderer(modality, renderer);
  }
}
