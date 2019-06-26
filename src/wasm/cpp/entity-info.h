#ifndef _ARCS_ENTITY_INFO_H
#define _ARCS_ENTITY_INFO_H

// GENERATED CODE - DO NOT EDIT

namespace arcs {

class Info {
public:
  // Entities must be copied with arcs::clone_entity(), which will exclude the internal id.
  // Move operations are ok (and will include the internal id).
  Info() = default;
  Info(Info&&) = default;
  Info& operator=(Info&&) = default;

  const std::string& _for() const { return for_; }
  void set_for(const std::string& value) { for_ = value; for_valid_ = true; }
  void clear_for() { for_ = std::string(); for_valid_ = false; }
  bool has_for() const { return for_valid_; }

  double internal_id() const { return internal_id_; }
  void set_internal_id(double value) { internal_id_ = value; internal_id_valid_ = true; }
  void clear_internal_id() { internal_id_ = double(); internal_id_valid_ = false; }
  bool has_internal_id() const { return internal_id_valid_; }

  // Equality is based only on the internal id. Use arcs::entities_equal() to compare fields.
  bool operator==(const Info& other) const { return _internal_id_ == other._internal_id_; }
  bool operator!=(const Info& other) const { return _internal_id_ != other._internal_id_; }

  // For STL containers.
  friend bool operator<(const Info& a, const Info& b) { return a._internal_id_ < b._internal_id_; }

  // For testing and debugging only; do not use this value for any production purpose.
  const std::string& _internal_id() const { return _internal_id_; }

private:
  // Allow private copying for use in Handles.
  Info(const Info&) = default;
  Info& operator=(const Info&) = default;

  std::string for_ = std::string();
  bool for_valid_ = false;

  double internal_id_ = double();
  bool internal_id_valid_ = false;

  std::string _internal_id_;
  static const int _FIELD_COUNT = 2;

  friend class Singleton<Info>;
  friend class Collection<Info>;
  friend Info clone_entity<Info>(const Info& entity);
  friend void internal::decode_entity<Info>(Info* entity, const char* str);
};

template<>
Info clone_entity(const Info& entity) {
  Info clone;
  clone.for_ = entity.for_;
  clone.for_valid_ = entity.for_valid_;
  clone.internal_id_ = entity.internal_id_;
  clone.internal_id_valid_ = entity.internal_id_valid_;
  return std::move(clone);
}

template<>
bool entities_equal(const Info& a, const Info& b) {
  return (a.has_for() ? (b.has_for() && a._for() == b._for()) : !b.has_for()) &&
         (a.has_internal_id() ? (b.has_internal_id() && a.internal_id() == b.internal_id()) : !b.has_internal_id());
}

template<>
std::string entity_to_str(const Info& entity, const char* join) {
  internal::StringPrinter printer;
  printer.addId(entity._internal_id());
  if (entity.has_for())
    printer.add("for: ", entity._for());
  if (entity.has_internal_id())
    printer.add("internal_id: ", entity.internal_id());
  return std::move(printer.result(join));
}

template<>
void internal::decode_entity(Info* entity, const char* str) {
  if (str == nullptr) return;
  internal::StringDecoder decoder(str);
  decoder.decode(entity->_internal_id_);
  decoder.validate("|");
  for (int i = 0; !decoder.done() && i < Info::_FIELD_COUNT; i++) {
    std::string name = decoder.upTo(':');
    if (0) {
    } else if (name == "for") {
      decoder.validate("T");
      decoder.decode(entity->for_);
      entity->for_valid_ = true;
    } else if (name == "internal_id") {
      decoder.validate("N");
      decoder.decode(entity->internal_id_);
      entity->internal_id_valid_ = true;
    }
    decoder.validate("|");
  }
}

template<>
std::string internal::encode_entity(const Info& entity) {
  internal::StringEncoder encoder;
  encoder.encode("", entity._internal_id());
  if (entity.has_for())
    encoder.encode("for:T", entity._for());
  if (entity.has_internal_id())
    encoder.encode("internal_id:N", entity.internal_id());
  return std::move(encoder.result());
}

}  // namespace arcs

// For STL unordered associative containers. Entities will need to be std::move()-inserted.
template<>
struct std::hash<arcs::Info> {
  size_t operator()(const arcs::Info& entity) const {
    return std::hash<std::string>()(entity._internal_id());
  }
};

#endif
