package arcs.android.client;

import java.util.HashMap;

import javax.inject.Inject;

import arcs.android.api.IRemoteOutputCallback;
import arcs.api.PortableJson;
import arcs.api.PortableJsonParser;
import arcs.api.UiBrokerImpl;
import arcs.api.UiRenderer;

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
    super(new HashMap<>());
    this.bridge = bridge;
    this.jsonParser = jsonParser;
  }

  @Override
  public void registerRenderer(String modality, UiRenderer renderer) {
    super.registerRenderer(modality, renderer);
    bridge.registerRenderer(modality, callback);
  }
}
