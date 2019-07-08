package arcs.webimpl;

import arcs.api.ArcsEnvironment;
import arcs.api.DeviceClient;
import elemental2.dom.*;
import jsinterop.annotations.JsType;

import javax.inject.Inject;
import java.util.function.Consumer;

import static elemental2.dom.DomGlobal.document;
import static elemental2.dom.DomGlobal.window;

/**
 * Mainly for testing in Chrome.
 */
public class WebHarnessController implements HarnessController {

    private ArcsEnvironment environment;
    private DeviceClient deviceClient;

    @Inject
    WebHarnessController(ArcsEnvironment environment, DeviceClient deviceClient) {
        this.environment = environment;
        this.deviceClient = deviceClient;
    }

    @Override
    public void init() {
        exportDeviceClient();

        // For loading shell.js
        HTMLScriptElement shellElement = (HTMLScriptElement) document.createElement("script");
        document.body = (HTMLBodyElement) document.createElement("body");
        // Because we're not loading index.html from within pipes-shell
        HTMLBaseElement base = (HTMLBaseElement) document.createElement("base");
        base.href = "pipes-shell-2/web/deploy/dist/";
        document.body.appendChild(base);

        shellElement.src = "./shell.js";
        shellElement.type = "module";
        document.body.appendChild(shellElement);

        // make two buttons in the UI
        document.body.appendChild(makeInputElement("Capture Place Entity",
                val -> environment.sendMessageToArcs(
                    "{\"message\": \"capture\", \"entity\":{\"type\": \"address\", \"name\": \"" + val +
                    "\", \"source\": \"com.google.android.apps.maps\"}}", null)));

        Element dataParagraph = makeParagraph();

        document.body.appendChild(makeInputElement("Autofill Address Entity",
                val -> environment.sendMessageToArcs(
                        "{\"message\": \"autofill\", \"modality\": \"dom\", \"entity\": {\"type\": \"address\"}}",
                        (id, result) -> dataParagraph.append("Test: " + result.toString()))));
        document.body.appendChild(dataParagraph);

        // Null out the current window.onclick test mechanism
        shellElement.onload = (evt) -> window.onclick = null;
    }


    @JsType(isNative = true, namespace = "<window>", name = "goog")
    static class Goog {
        public static native void exportSymbol(String name, DeviceClient obj);
    }

    private void exportDeviceClient() {
      Goog.exportSymbol("DeviceClient", this.deviceClient);
    }

    private Element makeParagraph() {
        return document.createElement("p");
    }

    private Node makeInputElement(String label, Consumer<String> handler) {
        HTMLDivElement div = (HTMLDivElement) document.createElement("div");
        HTMLInputElement input = (HTMLInputElement) document.createElement("input");
        HTMLButtonElement button = (HTMLButtonElement) document.createElement("button");
        button.append(label);
        div.appendChild(input);
        div.appendChild(button);
        button.addEventListener("click", evt -> handler.accept(input.value));
        return div;
    }
}
