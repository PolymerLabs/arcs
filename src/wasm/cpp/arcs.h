#ifndef _ARCS_H
#define _ARCS_H

#include <emscripten.h>
#include <string>
#include <vector>
#include <unordered_map>
#include <unordered_set>
#include <functional>
#include <memory>

namespace arcs {

using URL = std::string;
using Dictionary = std::unordered_map<std::string, std::string>;

class Handle;
class Particle;
class RefBase;
template<typename T> class Ref;

namespace internal {
extern "C" {

// --- Wasm-to-JS API ---

// singletonSet and collectionStore will create ids for entities if required, and will return
// the new ids in allocated memory that the Handle implementations will free.
extern const char* singletonSet(Particle* p, Handle* h, const char* encoded);
extern void singletonClear(Particle* p, Handle* h);
extern const char* collectionStore(Particle* p, Handle* h, const char* encoded);
extern void collectionRemove(Particle* p, Handle* h, const char* encoded);
extern void collectionClear(Particle* p, Handle* h);
extern void dereference(Particle* p, const char* id, const char* key, const char* schema_hash, int continuation_id);
extern void onRenderOutput(Particle* p, const char* template_str, const char* model);
extern void serviceRequest(Particle* p, const char* call, const char* args, const char* tag);

// Returns allocated memory that the Particle base class will free.
extern const char* resolveUrl(const char* url);

// Logging and error handling
extern void setLogInfo(const char* file, int line);
extern void systemError(const char* msg);

}  // extern "C"

// --- Packaging classes ---
// Used by the code generated from Schema definitions to pack and unpack serialized data.

class StringDecoder {
public:
  StringDecoder(const char* str) : str_(str) {}

  StringDecoder(StringDecoder&) = delete;
  StringDecoder(const StringDecoder&) = delete;
  StringDecoder& operator=(StringDecoder&) = delete;
  StringDecoder& operator=(const StringDecoder&) = delete;

  bool done() const;
  std::string upTo(char sep);
  int getInt(char sep);
  std::string chomp(int len);
  void validate(const std::string& token);
  template<typename T> void decode(T& val);
  template<typename T> void decode(Ref<T>& ref);

  static void decodeList(const char* str, std::function<void(const std::string&)> callback);
  static Dictionary decodeDictionary(const char* str);

private:
  const char* str_;
};

class StringEncoder {
public:
  StringEncoder() = default;

  StringEncoder(StringEncoder&) = delete;
  StringEncoder(const StringEncoder&) = delete;
  StringEncoder& operator=(StringEncoder&) = delete;
  StringEncoder& operator=(const StringEncoder&) = delete;

  template<typename T> void encode(const char* prefix, const T& val);
  template<typename T> void encode(const char* prefix, const Ref<T>& ref);
  std::string result();

  static std::string encodeDictionary(const Dictionary& dict);

private:
  static std::string encodeStr(const std::string& str);

  std::string str_;
};

// Used by generated entity_to_str() instances for general purpose display/logging.
class StringPrinter {
public:
  StringPrinter() = default;

  StringPrinter(StringPrinter&) = delete;
  StringPrinter(const StringPrinter&) = delete;
  StringPrinter& operator=(StringPrinter&) = delete;
  StringPrinter& operator=(const StringPrinter&) = delete;

  void addId(const std::string& id);
  void add(const char* literal);
  template<typename T> void add(const char* prefix, const T& val);
  template<typename T> void add(const char* prefix, const Ref<T>& ref);
  std::string result(const char* join);

private:
  std::vector<std::string> parts_;
};

// Hash combining borrowed from Boost.
template<typename T>
void hash_combine(std::size_t& seed, const T& v) {
  #if SIZE_WIDTH == 64
    static constexpr size_t magic = 0x9e3779b97f4a7c15;
  #else
    static constexpr size_t magic = 0x9e3779b9;
  #endif
  seed ^= std::hash<T>()(v) + magic + (seed << 6) + (seed >> 2);
}

// Wrapper type for user-provided dereference continuations.
using DerefContinuation = std::function<void(const char*)>;

// Various bits of code need private access to the generated entity classes. Wrapping them as
// static methods in a class simplifies things: it only requires a single friend directive, and
// allows partial specialization where standalone template functions do not.
class Accessor {
public:
  // -- Generated entity class functions --
  // These are exposed to particle implementations via the entity helpers defined below.

  template<typename T>
  static T clone_entity(const T& entity) {
    static_assert(sizeof(T) == 0, "Only schema-specific implementations of clone_entity can be used");
    return entity;
  }

  template<typename T>
  static size_t hash_entity(const T& entity) {
    static_assert(sizeof(T) == 0, "Only schema-specific implementations of hash_entity can be used");
    return 0;
  }

  template<typename T>
  static bool fields_equal(const T& a, const T& b) {
    static_assert(sizeof(T) == 0, "Only schema-specific implementations of fields_equal can be used");
    return false;
  }

  template<typename T>
  static std::string entity_to_str(const T& entity, const char* join, bool with_id) {
    static_assert(sizeof(T) == 0, "Only schema-specific implementations of entity_to_str can be used");
    return "";
  }

  // -- Data transport methods --

  template<typename T>
  static void decode_entity(T* entity, const char* str) {
    static_assert(sizeof(T) == 0, "Only schema-specific implementations of decode_entity can be used");
  }

  template<typename T>
  static std::string encode_entity(const T& entity) {
    static_assert(sizeof(T) == 0, "Only schema-specific implementations of encode_entity can be used");
    return "";
  }

  // Ref-based versions of the above; implemented below the Ref class definition.
  // clone_entity and fields_equal are not available for references.
  template<typename T> static size_t hash_entity(const Ref<T>& ref);
  template<typename T> static std::string entity_to_str(const Ref<T>& ref, const char* join, bool with_id);
  template<typename T> static void decode_entity(Ref<T>* ref, const char* str);
  template<typename T> static std::string encode_entity(const Ref<T>& ref);

  // -- Internal methods --

  template<typename T>
  static const std::string& get_id(const T& entity) {
    return entity._internal_id_;
  }

  template<typename T>
  static void set_id(T* entity, const std::string& id) {
    entity->_internal_id_ = id;
  }

  template<typename T>
  static const char* get_schema_hash() {
    return T::_schema_hash();
  }

  template<typename T> static void bind(Ref<T>* ref, const T& entity);
  static DerefContinuation wrap(const RefBase& ref, std::function<void()> continuation);
};

}  // namespace internal


// --- Logging ---
// console() and error() use printf-style formatting. File and line info is added automatically.

#define console(...) do {                           \
    arcs::internal::setLogInfo(__FILE__, __LINE__); \
    printf(__VA_ARGS__);                            \
  } while (0)

#define error(...) do {                             \
    arcs::internal::setLogInfo(__FILE__, __LINE__); \
    fprintf(stderr, __VA_ARGS__);                   \
  } while (0)


// --- Entity helpers ---
// Schema-specific implementations will be generated for the following:

// Copies the schema-based data fields; does not copy the internal id.
// This is not available for references.
template<typename T>
T clone_entity(const T& entity) {
  return internal::Accessor::clone_entity(entity);
}

// Generates a hash for all fields (including the internal id).
template<typename T>
size_t hash_entity(const T& entity) {
  return internal::Accessor::hash_entity(entity);
}

// Returns whether two entities have the same data fields set (does not compare internal ids).
// This is not available for references.
template<typename T>
bool fields_equal(const T& a, const T& b) {
  return internal::Accessor::fields_equal(a, b);
}

// Converts an entity to a string. Unset fields are omitted.
template<typename T>
std::string entity_to_str(const T& entity, const char* join = ", ", bool with_id = true) {
  return internal::Accessor::entity_to_str(entity, join, with_id);
}

// Strips trailing zeros, and the decimal point for integer values.
std::string num_to_str(double num);


// --- Storage classes ---

enum Direction { Unconnected, In, Out, InOut };

class Handle {
public:
  // Handle members for a Particle need to be given the name declared for that handle in the
  // particle manifest, and the 'this' pointer of the particle itself. For example:
  //   arcs::Singleton<arcs::Data> data_{this, "data"};
  Handle(Particle* particle, const char* name);

  virtual ~Handle() {}

  const std::string& name() const { return name_; }

  // These are called by the runtime and should not be used directly by Particle implementations.
  virtual void sync(const char* model) = 0;
  virtual void update(const char* encoded1, const char* encoded2) = 0;

protected:
  bool failForDirection(Direction bad_dir) const;

  std::string name_;
  Particle* particle_;
  Direction dir_ = Unconnected;  // initialized by the Particle class

  friend class Particle;
};

template<typename T>
class Singleton : public Handle {
public:
  using Handle::Handle;

  void sync(const char* model) override {
    failForDirection(Out);
    if (model) {
      entity_.reset(new T());
      internal::Accessor::decode_entity(entity_.get(), model);
    } else {
      entity_.reset();
    }
  }

  void update(const char* model, const char* ignored) override {
    sync(model);
  }

  // Do not store the raw pointer; when the handle is updated, the underlying object
  // is replaced and old pointers are therefore invalid.
  const T* get() const {
    failForDirection(Out);
    return entity_.get();
  }

  // For new entities created by a particle, this method will generate a new internal ID and update
  // the given entity with it. The data fields will not be modified.
  void set(T& entity) {
    failForDirection(In);
    std::string encoded = internal::Accessor::encode_entity(entity);
    const char* id = internal::singletonSet(particle_, this, encoded.c_str());
    if (id != nullptr) {
      entity._internal_id_ = id;
      free((void*)id);
    }
    // Write-only handles do not keep entity data locally.
    if (dir_ == InOut) {
      entity_.reset(new T(entity));
    }
  }

  void clear() {
    failForDirection(In);
    internal::singletonClear(particle_, this);
    if (dir_ == InOut) {
      entity_.reset();
    }
  }

private:
  std::unique_ptr<T> entity_;
};

// Minimal iterator for Collections; allows iterating directly over const T& values.
template<typename T>
class WrappedIter {
  using Iterator = typename std::unordered_map<std::string, std::unique_ptr<T>>::const_iterator;

public:
  WrappedIter(Iterator it) : it_(std::move(it)) {}

  T& operator*() { return *it_->second; }
  T* operator->() { return it_->second.get(); }

  const T& operator*() const { return *it_->second; }
  const T* operator->() const { return it_->second.get(); }

  WrappedIter& operator++() { ++it_; return *this; }
  WrappedIter operator++(int) { return WrappedIter(it_++); }

  friend bool operator==(const WrappedIter& a, const WrappedIter& b) { return a.it_ == b.it_; }
  friend bool operator!=(const WrappedIter& a, const WrappedIter& b) { return a.it_ != b.it_; }

private:
  Iterator it_;
};

template<typename T>
class Collection : public Handle {
  using Map = std::unordered_map<std::string, std::unique_ptr<T>>;

public:
  using Handle::Handle;

  void sync(const char* model) override {
    entities_.clear();
    add(model);
  }

  void update(const char* added, const char* removed) override {
    add(added);
    internal::StringDecoder::decodeList(removed, [this](const std::string& str) {
      std::string id;
      internal::StringDecoder(str.c_str()).decode(id);
      entities_.erase(id);
    });
  }

  bool empty() const {
    failForDirection(Out);
    return entities_.empty();
  }

  size_t size() const {
    failForDirection(Out);
    return entities_.size();
  }

  WrappedIter<T> begin() const {
    failForDirection(Out);
    return WrappedIter<T>(entities_.cbegin());
  }

  WrappedIter<T> end() const {
    failForDirection(Out);
    return WrappedIter<T>(entities_.cend());
  }

  // For new entities created by a particle, this method will generate a new internal ID and update
  // the given entity with it. The data fields will not be modified.
  void store(T& entity) {
    failForDirection(In);
    std::string encoded = internal::Accessor::encode_entity(entity);
    const char* id = internal::collectionStore(particle_, this, encoded.c_str());
    if (id != nullptr) {
      entity._internal_id_ = id;
      free((void*)id);
    }
    // Write-only handles do not keep entity data locally.
    if (dir_ == InOut) {
      entities_.emplace(entity._internal_id_, new T(entity));
    }
  }

  void remove(const T& entity) {
    failForDirection(In);
    std::string encoded = internal::Accessor::encode_entity(entity);
    internal::collectionRemove(particle_, this, encoded.c_str());
    if (dir_ == InOut) {
      entities_.erase(entity._internal_id_);
    }
  }

  void clear() {
    failForDirection(In);
    internal::collectionClear(particle_, this);
    if (dir_ == InOut) {
      entities_.clear();
    }
  }

private:
  void add(const char* added) {
    failForDirection(Out);
    internal::StringDecoder::decodeList(added, [this](const std::string& str) {
      std::unique_ptr<T> eptr(new T());
      internal::Accessor::decode_entity(eptr.get(), str.c_str());
      entities_.erase(eptr->_internal_id_);  // emplace doesn't overwrite
      entities_.emplace(eptr->_internal_id_, std::move(eptr));
    });
  }

  Map entities_;
};

// Non-templated base for the Ref class to simplify handling in Particles.
class RefBase {
public:
  virtual ~RefBase() {}

protected:
  virtual internal::DerefContinuation wrap(std::function<void()> continuation) const = 0;

  std::string _internal_id_;
  std::string storage_key_;
  const char* schema_hash_;

  friend class Particle;
  friend class internal::Accessor;
};

// Arcs-style reference to an entity.
template<typename T>
class Ref : public RefBase {
  struct Payload {
    bool dereferenced = false;
    T entity;
  };

public:
  Ref() : payload_(new Payload()) {
    schema_hash_ = T::_schema_hash();
  }

  // References are copyable and share a pointer to the underlying entity data.
  Ref(const Ref&) = default;
  Ref& operator=(const Ref&) = default;

  bool is_dereferenced() const {
    return payload_->dereferenced;
  }

  // Returns the underlying entity data. If this object has not been dereferenced yet,
  // this will be an empty instance of the entity type T.
  const T& entity() const {
    return payload_->entity;
  }

  bool operator==(const Ref<T>& other) const {
    return _internal_id_ == other._internal_id_ && storage_key_ == other.storage_key_;
  }

  bool operator!=(const Ref<T>& other) const {
    return !(*this == other);
  }

  // For STL containers.
  friend bool operator<(const Ref<T>& a, const Ref<T>& b) {
    int cmp = a._internal_id_.compare(b._internal_id_);
    return (cmp != 0) ? (cmp < 0) : (a.storage_key_.compare(b.storage_key_) < 0);
  }

protected:
  // Binds this reference to a different entity. This should not be used directly; call the
  // 'bind_<field>()' method on the generated entity classes instead.
  void bind(const T& entity) {
    _internal_id_ = internal::Accessor::get_id(entity);
    if (_internal_id_ != "" && storage_key_ != "") {
      payload_.reset(new Payload({true, entity}));
    } else {
      // TODO: binding to a newly minted entity, or with a currently unbound Ref instance
      std::string msg = "Binding a reference requires a valid id and storage key: id='" +
                        _internal_id_ + "', key='" + storage_key_;
      internal::systemError(msg.c_str());
    }
  }

  // Called by Particle::dereference to wrap the user's continuation function so we can update
  // the local entity here with the data provided by the runtime (via dereferenceResponse).
  internal::DerefContinuation wrap(std::function<void()> continuation) const override {
    if (is_dereferenced()) {
      continuation();
    } else if (_internal_id_ != "" && storage_key_ != "") {
      return [this, fn = std::move(continuation)](const char* encoded) {
        internal::Accessor::decode_entity(&payload_->entity, encoded);
        payload_->dereferenced = true;
        fn();
      };
    }
    return {};
  }

  std::shared_ptr<Payload> payload_;

  friend class Singleton<Ref<T>>;
  friend class Collection<Ref<T>>;
  friend class internal::Accessor;
  friend class internal::StringDecoder;
  friend class internal::StringEncoder;
};

namespace internal {

template<typename T>
void StringDecoder::decode(Ref<T>& ref) {
  decode(ref._internal_id_);
  validate("|");
  decode(ref.storage_key_);
  validate("|");
  std::string hash = upTo(':');
  if (hash != ref.schema_hash_) {
    std::string msg = "reference received with schema hash '" + hash +
                      "', but the generated entity code has '" + ref.schema_hash_ + "'\n";
    systemError(msg.c_str());
  }
}

template<typename T>
void StringEncoder::encode(const char* prefix, const Ref<T>& ref) {
  str_ += prefix + encodeStr(ref._internal_id_) + "|"
                 + encodeStr(ref.storage_key_) + "|"
                 + ref.schema_hash_ + ":|";
}

template<typename T>
inline void StringPrinter::add(const char* prefix, const Ref<T>& ref) {
  parts_.push_back(prefix + entity_to_str(ref));
}

template<typename T>
inline size_t Accessor::hash_entity(const Ref<T>& ref) {
  size_t h = 0;
  hash_combine(h, ref._internal_id_);
  hash_combine(h, ref.storage_key_);
  return h;
}

template<typename T>
inline std::string Accessor::entity_to_str(const Ref<T>& ref, const char* unused, bool with_id) {
  StringPrinter printer;
  printer.add("REF<");
  printer.add("", ref._internal_id_);
  if (ref.storage_key_ != "") {
    printer.add("|", ref.storage_key_);
  }
  if (ref.is_dereferenced()) {
    printer.add("|[", entity_to_str(ref.entity(), ", ", with_id));
    printer.add("]");
  }
  printer.add(">");
  return printer.result("");
}

template<typename T>
inline void Accessor::decode_entity(Ref<T>* ref, const char* str) {
  if (str != nullptr) {
    StringDecoder decoder(str);
    decoder.decode(*ref);
    decoder.validate("|");
  }
}

template<typename T>
inline std::string Accessor::encode_entity(const Ref<T>& ref) {
  StringEncoder encoder;
  encoder.encode("", ref);
  return encoder.result();
}

template<typename T>
void Accessor::bind(Ref<T>* ref, const T& entity) {
  ref->bind(entity);
}

inline DerefContinuation Accessor::wrap(const RefBase& ref, std::function<void()> continuation) {
  return ref.wrap(std::move(continuation));
}

}  // namespace internal

}  // namespace arcs

// For STL unordered associative containers.
template<typename T>
struct std::hash<arcs::Ref<T>> {
  size_t operator()(const arcs::Ref<T>& ref) const {
    return arcs::hash_entity(ref);
  }
};

namespace arcs {

// --- Particle base class ---

class Particle {
public:
  virtual ~Particle() {}

  // -- Setup --

  // Particle constructors may call this to indicate that the particle should automatically invoke
  // renderSlot() with the given slot name once all connected handles are synced, and thereafter
  // whenever a handle is updated.
  void autoRender(const std::string& slot_name = "root");

  // Called once a particle has been set up. Initial processing and service requests may be
  // executed here. Readable handles are *not* guaranteed to be synchronized at this point.
  // Write-only handles may safely be accessed.
  virtual void init() {}

  // -- Storage --

  // Called once during startup for each readable handle connected to the particle to indicate that
  // the handle has received its full data model. 'all_synced' will be true for the last such call
  // during startup. This may also be called after startup if a handle needed to re-synchronize with
  // its backing store (in which case 'all_synced' will also be true).
  virtual void onHandleSync(const std::string& name, bool all_synced) {}

  // Called after startup when a readable handle receives updated data (including writes from the
  // particle itself).
  virtual void onHandleUpdate(const std::string& name) {}

  // Retrieve a handle by name; e.g. auto h = getSingleton<arcs::SomeEntityType>(name)
  template<typename T>
  Singleton<T>* getSingleton(const std::string& name) const {
    auto it = handles_.find(name);
    return (it != handles_.end()) ? dynamic_cast<Singleton<T>*>(it->second) : nullptr;
  }

  template<typename T>
  Collection<T>* getCollection(const std::string& name) const {
    auto it = handles_.find(name);
    return (it != handles_.end()) ? dynamic_cast<Collection<T>*>(it->second) : nullptr;
  }

  // Retrieve a reference's entity data from the backing store. The first time this is called,
  // the given continuation will be executed *asynchronously* at some point after the calling
  // function has completed. Care should be taken with values being captured by a continuation
  // lambda. Subsequent calls will immediately execute the continuation with the previously
  // retrieved entity data. Example usage:
  //
  //   // Given the class field: arcs::Singleton<arcs::Ref<arcs::Data>> data_
  //   void onHandleUpdate(const std::string& name) override {
  //     if (name == "data") {
  //       dereference(data_.get(), [this] {
  //         do_something_with(data_.get().entity());
  //       });
  //     }
  //   }
  //
  // 'ref' is passed as a const& so this method can be used with the value returned from
  // Singleton and Collection handles, but its internal state will be updated with a local
  // copy of the retrieved entity data.
  void dereference(const RefBase& ref, std::function<void()> continuation) {
    internal::DerefContinuation wrapped = ref.wrap(continuation);
    if (wrapped) {
      continuations_.emplace(++continuation_id_, std::move(wrapped));
      internal::dereference(this, ref._internal_id_.c_str(), ref.storage_key_.c_str(),
                            ref.schema_hash_, continuation_id_);
    }
  }

  // -- Rendering and events --

  // Override to provide a template string for rendering into a slot. The string should be a
  // constant (templates may be cached by the runtime), optionally with "{{key}}" placeholders
  // that can be substituted for data values provided by populateModel().
  virtual std::string getTemplate(const std::string& slot_name) { return ""; }

  // Override to populate a model mapping the template {{placeholders}} to the current data values.
  virtual void populateModel(const std::string& slot_name, Dictionary* model) {}

  // Call to trigger a render from within the particle. 'send_template' and 'send_model' instruct
  // the system to call getTemplate() and populateModel() for this render, respectively. Also
  // invoked when auto-render is enabled after all readable handles have been synchronized.
  // TODO: it doesn't make sense to have both send flags false; ignore, error or convert to enum?
  void renderSlot(const std::string& slot_name, bool send_template = true, bool send_model = true);

  // Override to react to UI events triggered by handlers in the template provided above.
  // 'slot_name' will correspond to the rendering slot hosting the UI element associated with the
  // event indicated by 'handler'.
  virtual void fireEvent(const std::string& slot_name, const std::string& handler,
                         const arcs::Dictionary& eventData) {}

  // -- Services --

  // Particles may call this to resolve URLs like 'https://$particles/path/to/assets/pic.jpg'.
  // The '$here' prefix can be used to map to the location of the wasm binary file (for example:
  // '$here/path/to/assets/pic.jpg').
  std::string resolveUrl(const std::string& url);

  // Particles can request a service call using this method and the response will be delivered via
  // serviceResponse(). The optional tag argument can be used to disambiguate multiple request to
  // the same service point. 'call' is of the form "service.method"; for example: "clock.now".
  void serviceRequest(const std::string& call, const Dictionary& args, const std::string& tag = "");
  virtual void serviceResponse(
      const std::string& call, const Dictionary& response, const std::string& tag) {}

  // -- Internal API --
  // These are public to allow internal and runtime access, but should not be called by sub-classes.

  // Called by the Handle constructor to build the handles_ map.
  void registerHandle(Handle* handle);

  // Called by the runtime to associate the inner handle instance with the outer object.
  Handle* connectHandle(const char* name, bool can_read, bool can_write);

  // Called by the runtime to synchronize a handle.
  void sync(Handle* handle);

  // Called by the runtime to update a handle.
  void update(Handle* handle);

  // Called by the runtime in response to a dereference() call.
  void dereferenceResponse(int continuation_id, const char* encoded) {
    continuations_[continuation_id](encoded);
    continuations_.erase(continuation_id);
  }

private:
  std::unordered_map<std::string, Handle*> handles_;
  std::unordered_set<Handle*> to_sync_;
  std::string auto_render_slot_;
  std::unordered_map<int, internal::DerefContinuation> continuations_;
  int continuation_id_ = 0;
};

// Defines an exported function 'newParticleName()' that the runtime will call to create
// particles inside the wasm container.
#define DEFINE_PARTICLE(name)     \
  extern "C" {                    \
    EMSCRIPTEN_KEEPALIVE          \
    arcs::Particle* new##name() { \
      return new name();          \
    }                             \
  }

}  // namespace arcs

#endif
