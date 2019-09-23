package arcs.android.demo.chat;

import android.content.Context;
import arcs.android.api.Annotations.AppContext;
import arcs.android.client.AndroidClientModule;
import arcs.android.demo.service.ArcsServiceModule;
import dagger.BindsInstance;
import dagger.Component;
import javax.inject.Singleton;

@Singleton
@Component(modules = {AndroidClientModule.class, ArcsServiceModule.class})
public interface ChatActivityComponent {

  void inject(ChatActivity chatActivity);

  @Component.Builder
  interface Builder {
    @BindsInstance
    ChatActivityComponent.Builder appContext(@AppContext Context appContext);

    ChatActivityComponent build();
  }
}
