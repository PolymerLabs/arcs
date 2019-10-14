package arcs.android.demo;

import android.app.Application;

public class ArcsDemoApplication extends Application {

  private ArcsDemoApplicationComponent component;

  @Override
  public void onCreate() {
    super.onCreate();
    component = DaggerArcsDemoApplicationComponent.builder()
      .context(this)
      .build();
  }

  public ArcsDemoApplicationComponent getComponent() {
    return component;
  }
}
