#include <emscripten.h>
#include <stdlib.h>
#include <string_view>
#include <string>
#include <map>

EM_JS(void, console, (const char* msg), {})
EM_JS(void, consoleN, (const char* msg, int num), {})

#define MKSTR(text, args)  (std::string(text) + args).c_str()


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
    console(MKSTR("newHandle: ", name));
    Handle* h = new Handle(name);
    handles_[name] = h;
    return h;
  }

  void sync(Handle* handle, void* buffer, int size) {
    console(MKSTR("sync: ", handle->name()));
    consoleN("  buffer size:", size);

    // Will eventually decode protobuf; just extract 'num' for now.
    handle->num_ = ((unsigned char*)buffer)[0];
    consoleN("  num:", handle->get());

    onHandleSync(handle);
  }

  // Equivalent to setHandles() in the JS Particle.
  virtual void init() {}
  virtual void onHandleSync(Handle* handle) {}

  std::map<std::string_view, Handle*> handles_;
};


class TestParticle : public Particle {
public:
  virtual ~TestParticle() {}

  void init() override {
    consoleN("init", handles_.size());
  }

  void onHandleSync(Handle* handle) override {
    console(MKSTR("onHandleSync: ", handle->name()));
    if (strcmp(handle->name(), "data") == 0) {
      int newValue = handle->get() * 2;
      consoleN("writing res =", newValue);
      handles_["res"]->set(newValue);
    }
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

}
