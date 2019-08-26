package arcs.impl;

import android.content.Context;
import arcs.api.ArcsEnvironment;
import arcs.api.HarnessController;
import arcs.api.ShellApi;
import arcs.builtinparticles.ParticlesModule;
import dagger.BindsInstance;
import dagger.Component;
import javax.inject.Named;
import javax.inject.Singleton;

@Singleton
@Component(modules = {AndroidHarnessModule.class, ParticlesModule.class})
public interface AndroidHarnessComponent {
  ArcsEnvironment getArcsEnvironment();

  HarnessController getHarnessController();

  ShellApi getShellApi();

  @Component.Builder
  interface Builder {
    @BindsInstance
    Builder appContext(@Named("AppContext") Context appContext);

    AndroidHarnessComponent build();
  }
}
