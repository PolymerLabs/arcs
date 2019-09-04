package arcs.web.demo;

import javax.inject.Singleton;

import arcs.api.ArcsEnvironment;
import arcs.api.HarnessController;
import arcs.demo.particles.ParticlesModule;
import arcs.web.impl.WebHarnessModule;
import dagger.Component;

@Singleton
@Component(modules = {DemoModule.class, WebHarnessModule.class, ParticlesModule.class})
public interface DemoComponent {
  ArcsEnvironment getArcsEnvironment();

  HarnessController getHarnessController();
}
