package arcs.webimpl;

import static elemental2.dom.DomGlobal.document;
import static elemental2.dom.DomGlobal.window;

import arcs.api.ArcsEnvironment;
import arcs.api.DeviceClient;
import arcs.api.HarnessController;
import arcs.crdt.CollectionDataTest;
import elemental2.dom.*;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Consumer;
import javax.inject.Inject;
import jsinterop.annotations.JsType;

/** Mainly for testing in Chrome. */
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
    base.href = "pipes-shell/web/deploy/dist/";
    document.body.appendChild(base);

    shellElement.src = "./shell.js";
    shellElement.type = "module";
    document.body.appendChild(shellElement);

    // make two buttons in the UI
    document.body.appendChild(
        makeInputElement(
            "Capture Place Entity",
            val ->
                environment.sendMessageToArcs(
                    "{\"message\": \"capture\", \"entity\":{\"type\": \"address\", \"name\": \""
                        + val
                        + "\", \"source\": \"com.google.android.apps.maps\"}}",
                    null)));

    Element dataParagraph = makeParagraph();

    document.body.appendChild(
        makeInputElement(
            "Autofill Address Entity",
            val ->
                environment.sendMessageToArcs(
                    "{\"message\": \"autofill\", \"modality\": \"dom\", \"entity\": {\"type\": \"address\"}}",
                    (id, result) -> dataParagraph.append("Test: " + result))));
    document.body.appendChild(dataParagraph);

    // TODO: get rid of this once crdt tests are built and run properly as unittests.
    document.body.appendChild(addCrdtTests());
    document.body.appendChild(addJsonTests());

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

  private Node addJsonTests() {
    Map<String, Runnable> tests = new HashMap<>();
    tests.put("testEmpty", PortableJsonJsImplTest::testEmpty);
    tests.put("testObject", PortableJsonJsImplTest::testObject);
    tests.put("testArray", PortableJsonJsImplTest::testArray);

    return addTests("Test JSON", tests);
  }

  private Node addCrdtTests() {
    Map<String, Runnable> tests = new HashMap<>();
    tests.put("testInitiallyIsEmpty", CollectionDataTest::testInitiallyIsEmpty);
    tests.put("testTwoItemsSameActor", CollectionDataTest::testTwoItemsSameActor);
    tests.put("testSameValueTwoActors", CollectionDataTest::testSameValueTwoActors);
    tests.put(
        "testRejectAddsNotInSequence", CollectionDataTest::testRejectAddsNotInSequence);
    tests.put("testRemoveItem", CollectionDataTest::testRemoveItem);
    tests.put(
        "testRejectRemoveIfVersionMismatch",
            CollectionDataTest::testRejectRemoveIfVersionMismatch);
    tests.put(
        "testRejectRemoveNonexistent", CollectionDataTest::testRejectRemoveNonexistent);
    tests.put("testRejectRemoveTooOld", CollectionDataTest::testRejectRemoveTooOld);
    tests.put("testMergeModels", CollectionDataTest::testMergeModels);

    return addTests("Test CRDTs", tests);
  }

  private Node addTests(String caption, Map<String, Runnable> tests) {
    HTMLDivElement div = (HTMLDivElement) document.createElement("div");

    HTMLDivElement testsDiv = (HTMLDivElement) document.createElement("div");
    HTMLDivElement statusDiv = (HTMLDivElement) document.createElement("div");
    tests.forEach(
        (name, test) ->
            addTestButton(
                testsDiv,
                name,
                test,
                (status) -> {
                  statusDiv.appendChild(document.createTextNode(formatTestError(name, status)));
                  statusDiv.appendChild(document.createElement("br"));
                }));
    div.appendChild(document.createElement("hr"));
    div.appendChild(document.createTextNode(caption));
    div.appendChild(testsDiv);

    HTMLDivElement allTestsDiv = (HTMLDivElement) document.createElement("div");
    addTestButton(
        allTestsDiv,
        "RUN ALL TESTS",
        () -> {
          List<String> success = new ArrayList<>();
          List<String> failure = new ArrayList<>();
          tests.forEach(
              (name, test) -> {
                try {
                  test.run();
                  success.add(name);
                } catch (AssertionError e) {
                  failure.add(formatTestError(name, formatException(e)));
                }
              });
          StringBuilder builder = new StringBuilder();
          builder.append("Ran all tests: ").append(success.size()).append(" succeeded");
          if (success.size() > 0) {
            builder.append(" (").append(String.join("; ", success)).append(")");
          }
          builder.append(", ").append(failure.size()).append(" failed");
          if (failure.size() > 0) {
            builder.append(" (").append(String.join("; ", failure)).append(")");
          }
          throw new AssertionError(builder.toString());
        },
        (status) -> {
          statusDiv.appendChild(document.createTextNode(status));
          statusDiv.appendChild(document.createElement("br"));
        });
    div.appendChild(allTestsDiv);

    div.appendChild(statusDiv);
    return div;
  }

  private void addTestButton(Node div, String label, Runnable method, Consumer<String> status) {
    HTMLButtonElement button = (HTMLButtonElement) document.createElement("button");
    button.append(label);
    div.appendChild(button);
    button.addEventListener(
        "click",
        evt -> {
          try {
            method.run();
            status.accept(null);
          } catch (AssertionError e) {
            status.accept(formatException(e));
          }
        });
  }

  private String formatException(AssertionError error) {
    return error.getMessage() == null ? error.toString() : error.getMessage();
  }

  private String formatTestError(String label, String error) {
    return error == null
        ? ("SUCCESSFULLY ran " + label)
        : "FAILED running " + label + " with error: " + error;
  }
}
