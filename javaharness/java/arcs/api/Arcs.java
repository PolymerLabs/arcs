package arcs.api;

import java.util.List;

public interface Arcs {
  String MESSAGE_FIELD = "message";
  String RUN_ARC_MESSAGE = "runArc";
  String STOP_ARC_MESSAGE = "stopArc";
  String ARC_ID_FIELD = "arcId";
  String PEC_ID_FIELD = "pecId";
  String RECIPE_FIELD = "recipe";
  String PARTICLES_FIELD = "particles";
  String PARTICLE_ID_FIELD = "id";
  String PARTICLE_NAME_FIELD = "name";
  String PROVIDED_SLOT_ID_FIELD = "providedSlotId";

  default ArcData runArc(String recipe) {
    ArcData arcData = new ArcData.Builder().setRecipe(recipe).build();
    runArc(arcData);
    return arcData;
  }

  default ArcData runArc(String recipe, Particle particle) {
    ArcData arcData =
        new ArcData.Builder()
            .setRecipe(recipe)
            .addParticleData(new ArcData.ParticleData().setParticle(particle))
            .build();
    runArc(arcData);
    return arcData;
  }

  default ArcData runArc(String recipe, List<? extends Particle> particles) {
    ArcData.Builder builder = new ArcData.Builder().setRecipe(recipe);
    particles.forEach(particle -> builder.addParticleData(
        new ArcData.ParticleData().setParticle(particle)
    ));
    ArcData arcData = builder.build();
    runArc(arcData);
    return arcData;
  }

  default ArcData runArc(String recipe, String arcId, String pecId) {
    ArcData arcData =
        new ArcData.Builder().setRecipe(recipe).setArcId(arcId).setPecId(pecId).build();
    runArc(arcData);
    return arcData;
  }

  default ArcData runArc(String recipe, String arcId, String pecId, Particle particle) {
    ArcData arcData =
        new ArcData.Builder()
            .setRecipe(recipe)
            .setArcId(arcId)
            .setPecId(pecId)
            .addParticleData(new ArcData.ParticleData().setParticle(particle))
            .build();
    runArc(arcData);
    return arcData;
  }

  default ArcData runArc(String recipe, String arcId, String pecId,
                         List<? extends Particle> particles) {
    ArcData.Builder builder =
        new ArcData.Builder()
            .setRecipe(recipe)
            .setArcId(arcId)
            .setPecId(pecId);
    particles.forEach(particle -> builder.addParticleData(
        new ArcData.ParticleData().setParticle(particle)
    ));
    ArcData arcData = builder.build();
    runArc(arcData);
    return arcData;
  }

  void runArc(ArcData arcData);

  void stopArc(ArcData arcData);

  void sendMessageToArcs(String message);

  UiBroker getUiBroker();

  default void registerRenderer(String modality, UiRenderer renderer) {
    getUiBroker().registerRenderer(modality, renderer);
  }
}
