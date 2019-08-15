package arcs.webimpl;

import arcs.api.ArcsEnvironment;
import arcs.builtinparticles.ParticlesModule;
import dagger.Component;
import javax.inject.Singleton;

@Singleton
@Component(modules = {WebHarnessModule.class, ParticlesModule.class})
public interface WebHarnessComponent {
  ArcsEnvironment getArcsEnvironment();

  HarnessController getHarnessController();
}
