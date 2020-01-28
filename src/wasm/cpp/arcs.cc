#include <cstring>

// The following are required for handling exceptions in __cxa_throw.
#include <future>
#include <regex>
#include <ios>
#include <any>
#include <variant>

#include "src/wasm/cpp/arcs.h"

namespace arcs {
namespace internal {
extern "C" {

// --- Wasm-to-JS API ---

EM_JS(const char*, singletonSet, (Particle* p, Handle* h, const char* encoded), {})
EM_JS(void, singletonClear, (Particle* p, Handle* h), {})
EM_JS(const char*, collectionStore, (Particle* p, Handle* h, const char* encoded), {})
EM_JS(void, collectionRemove, (Particle* p, Handle* h, const char* encoded), {})
EM_JS(void, collectionClear, (Particle* p, Handle* h), {})
EM_JS(void, dereference, (Particle* p, const char* id, const char* key, const char* schema_hash, int continuation_id), {})
EM_JS(void, onRenderOutput, (Particle* p, const char* template_str, const char* model), {})
EM_JS(void, serviceRequest, (Particle* p, const char* call, const char* args, const char* tag), {})
EM_JS(const char*, resolveUrl, (const char* url), {})
EM_JS(void, setLogInfo, (const char* file, int line), {})
EM_JS(void, systemError, (const char* msg), {})

// --- JS-to-wasm API ---

EMSCRIPTEN_KEEPALIVE
Handle* connectHandle(Particle* particle, const char* name, bool can_read, bool can_write) {
  return particle->connectHandle(name, can_read, can_write);
}

EMSCRIPTEN_KEEPALIVE
void init(Particle* particle) {
  particle->init();
}

EMSCRIPTEN_KEEPALIVE
void syncHandle(Particle* particle, Handle* handle, const char* model) {
  handle->sync(model);
  particle->sync(handle);
}

EMSCRIPTEN_KEEPALIVE
void updateHandle(Particle* particle, Handle* handle, const char* encoded1, const char* encoded2) {
  handle->update(encoded1, encoded2);
  particle->update(handle);
}

EMSCRIPTEN_KEEPALIVE
void dereferenceResponse(Particle* particle, int continuation_id, const char* encoded) {
  particle->dereferenceResponse(continuation_id, encoded);
}

EMSCRIPTEN_KEEPALIVE
void renderSlot(Particle* particle, const char* slot_name, bool send_template, bool send_model) {
  particle->renderSlot(slot_name, send_template, send_model);
}

EMSCRIPTEN_KEEPALIVE
void fireEvent(Particle* particle, const char* slot_name, const char* handler, const char* eventData) {
  particle->fireEvent(slot_name, handler, StringDecoder::decodeDictionary(eventData));
}

EMSCRIPTEN_KEEPALIVE
void serviceResponse(Particle* particle, const char* call, const char* response, const char* tag) {
  Dictionary dict = StringDecoder::decodeDictionary(response);
  particle->serviceResponse(call, dict, tag);
}

// Wrap various extern functions that trigger errors with a single call point.
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Winvalid-noreturn"

EMSCRIPTEN_KEEPALIVE
void exit(int status) {
  std::string msg = "exit(" + std::to_string(status) +")";
  systemError(msg.c_str());
}

EMSCRIPTEN_KEEPALIVE
void abort() {
  systemError("abort");
}

EMSCRIPTEN_KEEPALIVE
void llvm_trap() {
  systemError("llvm_trap");
}

EMSCRIPTEN_KEEPALIVE
void __cxa_pure_virtual() {
  systemError("__cxa_pure_virtual");
}

EMSCRIPTEN_KEEPALIVE
void __setErrNo(int value) {
  std::string msg = "__setErrNo(" + std::to_string(value) +")";
  systemError(msg.c_str());
}

EMSCRIPTEN_KEEPALIVE
void __assert_fail(const char* condition, const char* filename, int line, const char* func) {
  std::string msg = std::string("Assertion failed: '") + condition  + "' at " + filename +
                    ":" + std::to_string(line) + ", function '" + func + "'";
  systemError(msg.c_str());
}

EMSCRIPTEN_KEEPALIVE
void* __cxa_allocate_exception(size_t size) {
  return malloc(size);
}

EMSCRIPTEN_KEEPALIVE
void __cxa_free_exception(void* ptr) {
  free(ptr);
}

EMSCRIPTEN_KEEPALIVE
void __cxa_throw(void* thrown_exception, std::type_info* info, void (*dtor)(void*)) {
  // You can't recover the typed exception directly from thrown_exception and info, and you can't
  // detect inheritance from std::type_info objects. So, ugly workaround it is: check most of the
  // standard C++ exception types and get the message where possible. This means custom exception
  // classes won't work well in wasm particles and developers should use one of the standard
  // exception classes instead.
  #define CHECK_ERR(error)                                       \
    if (*info == typeid(error)) {                                \
      msg += reinterpret_cast<error*>(thrown_exception)->what(); \
      break;                                                     \
    }

  std::string msg = std::string(info->name()) + ": ";
  do {
    // See https://en.cppreference.com/w/cpp/error/exception
    CHECK_ERR(std::logic_error)
    CHECK_ERR(std::invalid_argument)
    CHECK_ERR(std::domain_error)
    CHECK_ERR(std::length_error)
    CHECK_ERR(std::out_of_range)
    CHECK_ERR(std::future_error)
    CHECK_ERR(std::bad_optional_access)
    CHECK_ERR(std::runtime_error)
    CHECK_ERR(std::range_error)
    CHECK_ERR(std::overflow_error)
    CHECK_ERR(std::underflow_error)
    CHECK_ERR(std::regex_error)
    CHECK_ERR(std::system_error)
    CHECK_ERR(std::ios_base::failure)
    CHECK_ERR(std::bad_typeid)
    CHECK_ERR(std::bad_cast)
    CHECK_ERR(std::bad_any_cast)
    CHECK_ERR(std::bad_weak_ptr)
    CHECK_ERR(std::bad_function_call)
    CHECK_ERR(std::bad_alloc)
    CHECK_ERR(std::bad_array_new_length)
    CHECK_ERR(std::bad_exception)
    CHECK_ERR(std::bad_variant_access)
    msg += "(unknown exception type)";
  } while (0);
  systemError(msg.c_str());

  #undef CHECK_ERR
}

// Not sure what to do with this...
EMSCRIPTEN_KEEPALIVE
bool __cxa_uncaught_exception() {
  return false;
}

// System calls "needed" for printf support.
EMSCRIPTEN_KEEPALIVE int __syscall140(int, int) { return 0; }  // sys_lseek
EMSCRIPTEN_KEEPALIVE int __syscall6(int, int) { return 0; }    // sys_close
EMSCRIPTEN_KEEPALIVE int __syscall54(int, int) { return 0; }   // sys_ioctl

#pragma clang diagnostic pop

}  // extern "C"

// --- Packaging classes ---

// StringDecoder
bool StringDecoder::done() const {
  return str_ == nullptr || *str_ == 0;
}

std::string StringDecoder::upTo(char sep) {
  const char *p = strchr(str_, sep);
  if (p == nullptr) {
    error("Packaged entity decoding failed in upTo()\n");
    return "";
  }
  std::string token(str_, p - str_);
  str_ = p + 1;
  return token;
}

int StringDecoder::getInt(char sep) {
  std::string token = upTo(sep);
  return atoi(token.c_str());
}

std::string StringDecoder::chomp(int len) {
  // TODO: detect overrun
  std::string token(str_, len);
  str_ += len;
  return token;
}

void StringDecoder::validate(const std::string& token) {
  if (chomp(token.size()) != token) {
    error("Packaged entity decoding failed in validate()\n");
  }
}

template<>
void StringDecoder::decode(std::string& text) {
  int len = getInt(':');
  text = chomp(len);
}

template<>
void StringDecoder::decode(double& num) {
  std::string token = upTo(':');
  num = atof(token.c_str());
}

template<>
void StringDecoder::decode(bool& flag) {
  flag = (chomp(1)[0] == '1');
}

// Format is <size>:<length>:<value><length>:<value>...
void StringDecoder::decodeList(const char* str, std::function<void(const std::string&)> callback) {
  StringDecoder decoder(str);
  int num = decoder.getInt(':');
  while (num--) {
    int len = decoder.getInt(':');
    std::string chunk = decoder.chomp(len);
    callback(std::move(chunk));
  }
}

Dictionary StringDecoder::decodeDictionary(const char* str) {
  StringDecoder decoder(str);
  Dictionary dict;
  int num = decoder.getInt(':');
  while (num--) {
    int klen = decoder.getInt(':');
    std::string key = decoder.chomp(klen);
    int vlen = decoder.getInt(':');
    std::string val = decoder.chomp(vlen);
    dict.emplace(std::move(key), std::move(val));
  }
  return dict;
}

// StringEncoder
template<>
void StringEncoder::encode(const char* prefix, const std::string& str) {
  str_ += prefix + encodeStr(str) + "|";
}

template<>
void StringEncoder::encode(const char* prefix, const double& num) {
  str_ += prefix + num_to_str(num) + ":|";
}

template<>
void StringEncoder::encode(const char* prefix, const bool& flag) {
  str_ += prefix + std::to_string(flag) + "|";
}

// Destructive read; clears the internal buffer.
std::string StringEncoder::result() {
  std::string res = std::move(str_);
  str_ = "";
  return res;
}

std::string StringEncoder::encodeDictionary(const Dictionary& dict) {
  std::string encoded = std::to_string(dict.size()) + ":";
  for (const auto pair : dict) {
    encoded += encodeStr(pair.first) + encodeStr(pair.second);
  }
  return encoded;
}

std::string StringEncoder::encodeStr(const std::string& str) {
  return std::to_string(str.size()) + ":" + str;
}

// StringPrinter
void StringPrinter::addId(const std::string& id) {
  parts_.push_back("{" + id + "}");
}

void StringPrinter::add(const char* literal) {
  parts_.push_back(literal);
}

template<>
void StringPrinter::add(const char* prefix, const std::string& text) {
  parts_.push_back(prefix + text);
}

template<>
void StringPrinter::add(const char* prefix, const double& num) {
  parts_.push_back(prefix + num_to_str(num));
}

template<>
void StringPrinter::add(const char* prefix, const bool& flag) {
  parts_.push_back(prefix + std::string(flag ? "true" : "false"));
}

// Destructive read; clears the internal buffer.
std::string StringPrinter::result(const char* join) {
  std::string res;
  if (!parts_.empty()) {
    for (size_t i = 0; i < parts_.size() - 1; i++) {
      res += parts_[i] + join;
    }
    res += parts_.back();
  } else {
    res = "(empty)";
  }
  parts_.clear();
  return res;
}

}  // namespace internal

// --- Entity helpers ---

std::string num_to_str(double num) {
  std::string s = std::to_string(num);
  auto i = s.size() - 1;
  while (i > 0 && s[i] == '0') {
    i--;
  }
  s.erase((s[i] == '.') ? i : i + 1);
  return s;
}

// --- Storage classes ---

// Handle
Handle::Handle(Particle* particle, const char* name) : name_(name), particle_(particle) {
  particle_->registerHandle(this);
}

bool Handle::failForDirection(Direction bad_dir) const {
  if (dir_ == bad_dir) {
    std::string action = (bad_dir == In) ? "write to" : "read from";
    std::string type = (bad_dir == In) ? "in" : "out";
    std::string msg = "Cannot " + action + " '" + type + "' handle '" + name() + "'";
    internal::systemError(msg.c_str());
    return true;
  }
  return false;
}

// Particle
void Particle::registerHandle(Handle* handle) {
  handles_[handle->name()] = handle;
}

void Particle::autoRender(const std::string& slot_name) {
  auto_render_slot_ = slot_name;
}

Handle* Particle::connectHandle(const char* name, bool can_read, bool can_write) {
  auto pair = handles_.find(name);
  if (pair == handles_.end()) {
    return nullptr;
  }
  Handle* handle = pair->second;
  if (can_read) {
    to_sync_.insert(handle);
    handle->dir_ = can_write ? InOut : In;
  } else {
    handle->dir_ = Out;
  }
  return handle;
}

void Particle::sync(Handle* handle) {
  to_sync_.erase(handle);
  onHandleSync(handle->name(), to_sync_.empty());
  if (to_sync_.empty() && !auto_render_slot_.empty()) {
    renderSlot(auto_render_slot_);
  }
}

void Particle::update(Handle* handle) {
  onHandleUpdate(handle->name());
  if (!auto_render_slot_.empty()) {
    renderSlot(auto_render_slot_);
  }
}

void Particle::renderSlot(const std::string& slot_name, bool send_template, bool send_model) {
  const char* template_ptr = nullptr;
  std::string template_str;
  if (send_template) {
    template_str = getTemplate(slot_name);
    template_ptr = template_str.c_str();
  }

  const char* model_ptr = nullptr;
  std::string model;
  if (send_model) {
    Dictionary dict;
    populateModel(slot_name, &dict);
    model = internal::StringEncoder::encodeDictionary(dict);
    model_ptr = model.c_str();
  }

  internal::onRenderOutput(this, template_ptr, model_ptr);
}

std::string Particle::resolveUrl(const std::string& url) {
  const char* p = internal::resolveUrl(url.c_str());
  std::string resolved = p;
  free((void*)p);
  return resolved;
}

void Particle::serviceRequest(
    const std::string& call, const Dictionary& args, const std::string& tag) {
  std::string encoded = internal::StringEncoder::encodeDictionary(args);
  internal::serviceRequest(this, call.c_str(), encoded.c_str(), tag.c_str());
}

}  // namespace arcs
