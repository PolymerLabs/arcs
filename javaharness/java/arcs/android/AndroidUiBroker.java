package arcs.android;

import java.util.Map;

import javax.inject.Inject;

import arcs.android.IRemoteOutputCallback;
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
  AndroidUiBroker(
      Map<String, UiRenderer> renderers, ArcsServiceBridge bridge, PortableJsonParser jsonParser) {
    super(renderers);
    this.bridge = bridge;
    this.jsonParser = jsonParser;
    this.renderers.forEach((modality, renderer) -> bridge.registerRenderer(modality, callback));
  }

  @Override
  public void registerRenderer(String modality, UiRenderer renderer) {
    super.registerRenderer(modality, renderer);
    bridge.registerRenderer(modality, callback);
  }
}
