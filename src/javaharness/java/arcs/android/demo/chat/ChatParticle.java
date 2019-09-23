package arcs.android.demo.chat;

import arcs.api.Collection;
import arcs.api.Handle;
import arcs.api.ParticleBase;
import arcs.api.PortableJson;
import java.util.Map;
import java.util.SortedMap;
import java.util.TreeMap;
import java.util.function.Consumer;

public class ChatParticle extends ParticleBase {

  private Collection messagesHandle;
  private final Consumer<String> callback;
  private SortedMap<Integer, String> chatMessages = new TreeMap<>();
  private int nextIndex = 0;

  ChatParticle(Consumer<String> callback) {
    this.callback = callback;
  }

  public void addChatMessage(String message) {
    PortableJson data = jsonParser.emptyObject();
    data.put("index", nextIndex++);
    data.put("text", message);
    messagesHandle.store(jsonParser.emptyObject().put("rawData", data));
  }

  @Override
  public void setHandles(Map<String, Handle> handleByName) {
    super.setHandles(handleByName);
    messagesHandle = (Collection) handleByName.get("messages");
  }

  @Override
  public void onHandleSync(Handle handle, PortableJson model) {
    super.onHandleSync(handle, model);

    for (int i = 0; i < model.getLength(); i++) {
      PortableJson entity = model.getObject(i);
      addMessageFromHandle(handle, entity);
    }
    onChatUpdate();
  }

  @Override
  public void onHandleUpdate(Handle handle, PortableJson update) {
    super.onHandleUpdate(handle, update);

    if (!handle.name.equals("happy")) {
      return;
    }

    if (update.hasKey("added")) {
      PortableJson added = update.getArray("added");
      for (int i = 0; i < added.getLength(); i++) {
        PortableJson entity = added.getObject(i).getObject("rawData");
        addMessageFromHandle(handle, entity);
      }
    }

    onChatUpdate();
  }

  private void addMessageFromHandle(Handle handle, PortableJson entity) {
    // Messages from the happy handle should overwrite unhappy messages.
    boolean shouldOverwrite = handle.name.equals("happy");

    int index = entity.getInt("index");
    String text = entity.getString("text");
    if (shouldOverwrite || !chatMessages.containsKey(index)) {
      chatMessages.put(index, text);
    }
  }

  private void onChatUpdate() {
    callback.accept(String.join("\n", chatMessages.values()));
  }
}
