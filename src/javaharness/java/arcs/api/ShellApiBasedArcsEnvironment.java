package arcs.api;

import javax.inject.Inject;
import java.util.Map;

/**
 * Web based ArcsEnvironment using ShellApi. The Android version of this will different only in
 * not needing to use the ShellApi + Web runtime.
 */
public class ShellApiBasedArcsEnvironment implements ArcsEnvironment {

  private final Map<String, SuggestionListener> inProgress;
  private ShellApi shellApi;
  private ParticleExecutionContext pec;

  @Inject
  public ShellApiBasedArcsEnvironment(Map<String, SuggestionListener> inProgress, ShellApi shellApi,
                                      ParticleExecutionContext pec) {
    this.inProgress = inProgress;
    this.shellApi = shellApi;
    this.pec = pec;
  }

  @Override
  public void sendEntityToArcs(String entity, SuggestionListener listener) {
    String transactionId = shellApi.receiveEntity(entity);
    inProgress.put(transactionId, listener);
  }

  @Override
  public void observeEntityInArcs(String entity) {
    shellApi.observeEntity(entity);
  }

  @Override
  public void chooseSuggestion(String suggestion) {
    shellApi.chooseSuggestion(suggestion);
  }

  @Override
  public void addReadyListener(ReadyListener listener) {
  }

  @Override
  public void init() {
  }

  @Override
  public void reset() {
  }

  @Override
  public void destroy() {
  }

  @Override
  public void show() {
  }

  @Override
  public void hide() {
  }
}
