package arcs.android.client;

import android.os.RemoteException;
import arcs.android.api.IRemoteOutputCallback;
import arcs.api.PortableJson;
import arcs.api.PortableJsonParser;
import arcs.api.UiBrokerImpl;
import arcs.api.UiRenderer;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;
import java.util.List;
import javax.inject.Inject;

public class AndroidUiBroker extends UiBrokerImpl {
  private final IRemoteOutputCallback callback =
      new IRemoteOutputCallback.Stub() {
        @Override
        public void onOutput(String output) {
          PortableJson json = jsonParser.parse(output);
          render(json);
        }
      };

  private final ArcsServiceBridge bridge;
  private final PortableJsonParser jsonParser;

  @Inject
  AndroidUiBroker(ArcsServiceBridge bridge, PortableJsonParser jsonParser) {
    super(new HashMap<String, UiRenderer>());
    this.bridge = bridge;
    this.jsonParser = jsonParser;
  }

  @Override
  public void registerRenderer(String modality, UiRenderer renderer) {
    super.registerRenderer(modality, renderer);
    remoteRegister(Arrays.asList(modality));
  }

  private void remoteRegister(List<String> modalities) {
    bridge
        .connectToArcsService()
        .thenAccept(
            service -> {
              try {
                service.registerRenderers(modalities, callback);
              } catch (RemoteException e) {
                throw new RuntimeException(e);
              }
            }
    );
  }
}
