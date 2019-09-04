package arcs.android.demo;

import android.content.Context;

import javax.inject.Named;
import javax.inject.Singleton;

import arcs.android.impl.AndroidHarnessModule;
import arcs.api.HarnessController;
import arcs.api.ShellApi;
import arcs.demo.particles.ParticlesModule;
import dagger.BindsInstance;
import dagger.Component;

@Singleton
@Component(modules = {DemoModule.class, AndroidHarnessModule.class, ParticlesModule.class})
public interface DemoComponent {

  HarnessController getHarnessController();

  ShellApi getShellApi();

  @Component.Builder
  interface Builder {
    @BindsInstance
    Builder appContext(@Named("AppContext") Context appContext);

    DemoComponent build();
  }
}
