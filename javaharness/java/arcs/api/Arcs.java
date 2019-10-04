package arcs.api;

public interface Arcs {
  default ArcData runArc(String recipe) {
    ArcData arcData = new ArcData.Builder().setRecipe(recipe).build();
    runArc(arcData);
    return arcData;
  }

  default ArcData runArc(String recipe, Particle particle) {
    ArcData arcData = new ArcData.Builder().setRecipe(recipe).setParticle(particle).build();
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
            .setParticle(particle)
            .build();
    runArc(arcData);
    return arcData;
  }

  void runArc(ArcData arcData);

  void stopArc(ArcData arcData);

  UiBroker getUiBroker();

  default void registerRenderer(String modality, UiRenderer renderer) {
    getUiBroker().registerRenderer(modality, renderer);
  }
}
