package arcs.webimpl;

import arcs.api.ShellApi;
import jsinterop.annotations.JsType;

import javax.inject.Inject;

/**
 * Exposes Shell (Window) scope methods into Java from JS.
 */
public class ShellApiImpl implements ShellApi {

    @Inject
    public ShellApiImpl() {
    }


    @JsType(isNative = true, namespace = "<window>", name = "ShellApi")
    private static class NativeShellApi {
        public static native void observeEntity(String entityJson);

        public static native String receiveEntity(String entityJson);

        public static native void chooseSuggestion(String suggestion);

        public static native void postMessage(String msgToSendToHost);
    }

    @Override
    public void observeEntity(String entityJson) {
        NativeShellApi.observeEntity(entityJson);
    }

    @Override
    public String receiveEntity(String entityJson) {
        return NativeShellApi.receiveEntity(entityJson);
    }

    @Override
    public void chooseSuggestion(String suggestion) {
        NativeShellApi.chooseSuggestion(suggestion);
    }

    @Override
    public void postMessage(String msgToSendToHost) {
        NativeShellApi.postMessage(msgToSendToHost);
    }
}
