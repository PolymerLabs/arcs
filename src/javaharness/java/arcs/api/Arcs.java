package arcs.api;

public interface Arcs {
  Arc runArc(String recipe);

  Arc runArc(String recipe, Particle particle);

  Arc runArc(String recipe, String arcId, String pecId);

  Arc runArc(String recipe, String arcId, String pecId, Particle particle);

  void runArc(Arc arc);

  void stopArc(String arcId, String pecId);

  void registerRenderer(String modality, UiRenderer renderer);
}
