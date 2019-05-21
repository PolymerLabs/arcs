#include <emscripten.h>
#include <stdlib.h>
#include <string_view>
#include <string>
#include <map>

EM_JS(void, _console, (int line, const char* msg), {})
EM_JS(void, _consoleN, (int line, const char* msg, int num), {})

#define console(msg)        _console(__LINE__, msg)
#define consoleN(msg, num)  _consoleN(__LINE__, msg, num)
#define mkstr(text, args)   (std::string(text) + args).c_str()


class Handle;

EM_JS(void, handleSet, (Handle* handle, int num), {})


class Handle {
public:
  Handle(const char* name) : name_(name), num_(0) {}

  ~Handle() {
    if (name_ != nullptr) {
      free((void*)name_);
      name_ = nullptr;
    }
  }

  const char* name() { return name_; }
  int get() { return num_; }

  void set(int num) {
    num_ = num;
    handleSet(this, num);
  }

  const char* name_;
  int num_;
};


class Particle {
public:
  virtual ~Particle() {}

  Handle* newHandle(const char* name) {
    console(mkstr("newHandle: ", name));
    Handle* h = new Handle(name);
    handles_[name] = h;
    return h;
  }

  void sync(Handle* handle, void* buffer, int size) {
    console(mkstr("sync: ", handle->name()));
    consoleN("  buffer size:", size);

    // Will eventually decode protobuf; just extract 'num' for now.
    handle->num_ = ((unsigned char*)buffer)[0];
    consoleN("  num:", handle->get());

    onHandleSync(handle);
  }

  void* render(const char* slotName) {
    console(mkstr("render: ", slotName));
    std::string content = renderSlot(slotName);
    unsigned char* buf = (unsigned char*)malloc(content.size() + 1);
    memcpy(buf, content.c_str(), content.size());
    buf[content.size()] = 0;
    return buf;
  }

  // Equivalent to setHandles() in the JS Particle.
  virtual void init() {}
  virtual void onHandleSync(Handle* handle) {}
  virtual std::string renderSlot(std::string_view slotName) { return ""; }
  virtual void fireEvent(std::string_view slotName, std::string_view handler) {}

  std::map<std::string_view, Handle*> handles_;
};


class TestParticle : public Particle {
public:
  virtual ~TestParticle() {}

  void init() override {
    consoleN("init", handles_.size());
  }

  void onHandleSync(Handle* handle) override {
    console(mkstr("onHandleSync: ", handle->name()));
    if (strcmp(handle->name(), "data") == 0) {
      int newValue = handle->get() * 2;
      consoleN("writing res =", newValue);
      handles_["res"]->set(newValue);
    }
  }

  std::string renderSlot(std::string_view slotName) override {
    std::string content = "<div on-click=\"me\"><i>Hello from <span on-click=\"THE_WASM\">wasm!</span> This slot is '";
    content += slotName;
    content += "'</i></div>";
    return content;
  }

  void fireEvent(std::string_view slotName, std::string_view handler) override {
    console(mkstr("You clicked ", std::string(handler) + "!"));
  }
};


extern "C" {

EMSCRIPTEN_KEEPALIVE
Particle* newParticle() {
  return new TestParticle();
}

// Takes ownership of name.
EMSCRIPTEN_KEEPALIVE
Handle* newHandle(Particle* particle, const char* name) {
  return particle->newHandle(name);
}

EMSCRIPTEN_KEEPALIVE
void initParticle(Particle* particle) {
  particle->init();
}

// Does not take ownership of buffer; external caller frees.
EMSCRIPTEN_KEEPALIVE
void syncHandle(Particle* particle, Handle* handle, void* buffer, int size) {
  particle->sync(handle, buffer, size);
}

// Does not take ownership of slotName; external caller frees.
// Caller also takes ownership of returned allocated buffer.
EMSCRIPTEN_KEEPALIVE
void* renderSlot(Particle* particle, const char* slotName) {
  return particle->render(slotName);
}

// Does not take ownership of slotName or handler; external caller frees.
EMSCRIPTEN_KEEPALIVE
void fireEvent(Particle* particle, const char* slotName, const char* handler) {
  particle->fireEvent(slotName, handler);
}

}
