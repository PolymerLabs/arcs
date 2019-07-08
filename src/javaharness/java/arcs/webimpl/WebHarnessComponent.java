package arcs.webimpl;

import arcs.api.ArcsEnvironment;
import arcs.nativeparticles.NativeParticlesModule;
import dagger.Component;
import javax.inject.Singleton;

@Singleton
@Component(modules = {WebHarnessModule.class, NativeParticlesModule.class})
public interface WebHarnessComponent {
  ArcsEnvironment getArcsEnvironment();
  HarnessController getHarnessController();
}
