package arcs.webimpl;

import arcs.api.ArcsEnvironment;
import arcs.api.DeviceClient;
import arcs.api.PortableJson;
import arcs.api.PortableJsonParser;
import jsinterop.annotations.JsType;

import javax.inject.Inject;
import java.util.LinkedHashSet;
import java.util.Map;

import static elemental2.dom.DomGlobal.window;

@JsType(namespace = "arcs")

public class DeviceClientJsImpl implements DeviceClient {

    private PortableJsonParser jsonParser;
    private Map<String, ArcsEnvironment.SuggestionListener> inProgress;

    @Inject
    public DeviceClientJsImpl(PortableJsonParser jsonParser,
                              Map<String, ArcsEnvironment.SuggestionListener> inProgress) {
        this.jsonParser = jsonParser;
        this.inProgress = inProgress;
    }

    public void foundSuggestions(String transactionId, String content) {
        try {
//            window.alert("Found Suggestions2 called " + content);

            LinkedHashSet<String> suggestions = new LinkedHashSet<>();

            // We accept either an json array of objects or json object
            if (content.startsWith("[")) {
                PortableJson suggestionArray = jsonParser.parse(content);
                if (suggestionArray.getLength() == 0) {
                    return;
                }
                int i = 0;
                // only use first suggestion for now
                String suggestion = suggestionArray.getString(i);
                suggestions.add(suggestion);
            } else if (content.startsWith("{")) {
                suggestions.add(content);
            } else {
                // TODO: log2
            }
            if (inProgress.containsKey(transactionId)) {
                inProgress.get(transactionId).onSuggestion(transactionId, suggestions);
            }
        } catch (Exception e) {
            // TODO: log
        } finally {
            inProgress.remove(transactionId);
        }
    }

    public void shellReady() {
    }

    public void notifyAutofillTypes(String types) {
    }

    public void postMessage(String msg) {
        // TODO: decode api-channel mappings and invoke PEC functions
    }
}
