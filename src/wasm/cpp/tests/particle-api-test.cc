#include "src/wasm/cpp/arcs.h"
#include "src/wasm/cpp/tests/entities.h"

class HandleSyncUpdateTest : public AbstractHandleSyncUpdateTest {
public:
  void onHandleSync(const std::string& name, bool all_synced) override {
    arcs::HandleSyncUpdateTest_Res out;
    out.set_txt("sync:" + name + (all_synced ? ":true" : ":false"));
    res_.store(out);
  }

  void onHandleUpdate(const std::string& name) override {
    arcs::HandleSyncUpdateTest_Res out;
    out.set_txt("update:" + name);
    if (auto input = getSingleton<arcs::HandleSyncUpdateTest_Sng>(name)) {
      out.set_num(input->get().num());
    } else if (auto input = getCollection<arcs::HandleSyncUpdateTest_Col>(name)) {
      out.set_num(input->begin()->num());
    } else {
      out.set_txt("unexpected handle name: " + name);
    }
    res_.store(out);
  }
};

DEFINE_PARTICLE(HandleSyncUpdateTest)


class RenderTest : public AbstractRenderTest {
public:
  std::string getTemplate(const std::string& slot_name) override {
    return "abc";
  }

  void populateModel(const std::string& slot_name, arcs::Dictionary* model) override {
    model->emplace("foo", "bar");
  }

  void onHandleUpdate(const std::string& name) override {
    const arcs::RenderTest_Flags& flags = flags_.get();
    renderSlot("root", flags._template(), flags.model());
  }
};

DEFINE_PARTICLE(RenderTest)


class AutoRenderTest : public AbstractAutoRenderTest {
public:
  AutoRenderTest() {
    autoRender();
  }

  std::string getTemplate(const std::string& slot_name) override {
    const arcs::AutoRenderTest_Data& data = data_.get();
    return data.txt();
  }
};

DEFINE_PARTICLE(AutoRenderTest)


class EventsTest : public AbstractEventsTest {
public:
  void fireEvent(const std::string& slot_name, const std::string& handler,
                 const arcs::Dictionary& eventData) override {
    arcs::EventsTest_Output out;
    out.set_txt("event:" + slot_name + ":" + handler + ":" + eventData.find("info")->second);
    output_.set(out);
  }
};

DEFINE_PARTICLE(EventsTest)


class ServicesTest : public AbstractServicesTest {
public:
  void init() override {
    std::string url = resolveUrl("$resolve-me");
    arcs::ServicesTest_Output out;
    out.set_call("resolveUrl");
    out.set_payload(url);
    output_.store(out);

    serviceRequest("random.next", {}, "first");
    serviceRequest("random.next", {}, "second");
    serviceRequest("clock.now", {{"timeUnit", "DAYS"}});
  }

  void serviceResponse(
      const std::string& call, const arcs::Dictionary& response, const std::string& tag) override {
    std::string payload;
    for (const auto& pair : response) {
      payload += pair.first + ":" + pair.second + ";";
    }

    arcs::ServicesTest_Output out;
    out.set_call(call);
    out.set_tag(tag);
    out.set_payload(payload);
    output_.store(out);
  }
};

DEFINE_PARTICLE(ServicesTest)


class UnicodeTest : public AbstractUnicodeTest {
public:
  void onHandleUpdate(const std::string& name) override {
    arcs::UnicodeTest_Res out;
    out.set_src("åŗċş 🌈");
    if (name == "sng") {
      out.set_pass(sng_.get().pass());
    } else {
      out.set_pass(col_.begin()->pass());
    }
    res_.store(out);
  }
};

DEFINE_PARTICLE(UnicodeTest)
