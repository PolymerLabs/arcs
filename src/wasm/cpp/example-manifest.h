#ifndef _ARCS_EXAMPLE_MANIFEST_H
#define _ARCS_EXAMPLE_MANIFEST_H

// GENERATED CODE - DO NOT EDIT

namespace arcs {

class Data {
public:
  // Entities must be copied with arcs::clone_entity(), which will exclude the internal id.
  // Move operations are ok (and will include the internal id).
  Data() = default;
  Data(Data&&) = default;
  Data& operator=(Data&&) = default;

  double num() const { return num_; }
  void set_num(double value) { num_ = value; num_valid_ = true; }
  void clear_num() { num_ = double(); num_valid_ = false; }
  bool has_num() const { return num_valid_; }

  const std::string& txt() const { return txt_; }
  void set_txt(const std::string& value) { txt_ = value; txt_valid_ = true; }
  void clear_txt() { txt_ = std::string(); txt_valid_ = false; }
  bool has_txt() const { return txt_valid_; }

  const URL& lnk() const { return lnk_; }
  void set_lnk(const URL& value) { lnk_ = value; lnk_valid_ = true; }
  void clear_lnk() { lnk_ = URL(); lnk_valid_ = false; }
  bool has_lnk() const { return lnk_valid_; }

  bool flg() const { return flg_; }
  void set_flg(bool value) { flg_ = value; flg_valid_ = true; }
  void clear_flg() { flg_ = bool(); flg_valid_ = false; }
  bool has_flg() const { return flg_valid_; }

  // Equality is based only on the internal id. Use arcs::entities_equal() to compare fields.
  bool operator==(const Data& other) const { return _internal_id_ == other._internal_id_; }
  bool operator!=(const Data& other) const { return _internal_id_ != other._internal_id_; }

  // For STL containers.
  friend bool operator<(const Data& a, const Data& b) { return a._internal_id_ < b._internal_id_; }

  // For testing and debugging only; do not use this value for any production purpose.
  const std::string& _internal_id() const { return _internal_id_; }

private:
  // Allow private copying for use in Handles.
  Data(const Data&) = default;
  Data& operator=(const Data&) = default;

  double num_ = double();
  bool num_valid_ = false;

  std::string txt_ = std::string();
  bool txt_valid_ = false;

  URL lnk_ = URL();
  bool lnk_valid_ = false;

  bool flg_ = bool();
  bool flg_valid_ = false;

  std::string _internal_id_;
  static const int _FIELD_COUNT = 4;

  friend class Singleton<Data>;
  friend class Collection<Data>;
  friend Data clone_entity<Data>(const Data& entity);
  friend void internal::decode_entity<Data>(Data* entity, const char* str);
};

template<>
Data clone_entity(const Data& entity) {
  Data clone;
  clone.num_ = entity.num_;
  clone.num_valid_ = entity.num_valid_;
  clone.txt_ = entity.txt_;
  clone.txt_valid_ = entity.txt_valid_;
  clone.lnk_ = entity.lnk_;
  clone.lnk_valid_ = entity.lnk_valid_;
  clone.flg_ = entity.flg_;
  clone.flg_valid_ = entity.flg_valid_;
  return std::move(clone);
}

template<>
bool entities_equal(const Data& a, const Data& b) {
  return (a.has_num() ? (b.has_num() && a.num() == b.num()) : !b.has_num()) &&
         (a.has_txt() ? (b.has_txt() && a.txt() == b.txt()) : !b.has_txt()) &&
         (a.has_lnk() ? (b.has_lnk() && a.lnk() == b.lnk()) : !b.has_lnk()) &&
         (a.has_flg() ? (b.has_flg() && a.flg() == b.flg()) : !b.has_flg());
}

template<>
std::string entity_to_str(const Data& entity, const char* join) {
  internal::StringPrinter printer;
  printer.addId(entity._internal_id());
  if (entity.has_num())
    printer.add("num: ", entity.num());
  if (entity.has_txt())
    printer.add("txt: ", entity.txt());
  if (entity.has_lnk())
    printer.add("lnk: ", entity.lnk());
  if (entity.has_flg())
    printer.add("flg: ", entity.flg());
  return std::move(printer.result(join));
}

template<>
void internal::decode_entity(Data* entity, const char* str) {
  if (str == nullptr) return;
  internal::StringDecoder decoder(str);
  decoder.decode(entity->_internal_id_);
  decoder.validate("|");
  for (int i = 0; !decoder.done() && i < Data::_FIELD_COUNT; i++) {
    std::string name = decoder.upTo(':');
    if (0) {
    } else if (name == "num") {
      decoder.validate("N");
      decoder.decode(entity->num_);
      entity->num_valid_ = true;
    } else if (name == "txt") {
      decoder.validate("T");
      decoder.decode(entity->txt_);
      entity->txt_valid_ = true;
    } else if (name == "lnk") {
      decoder.validate("U");
      decoder.decode(entity->lnk_);
      entity->lnk_valid_ = true;
    } else if (name == "flg") {
      decoder.validate("B");
      decoder.decode(entity->flg_);
      entity->flg_valid_ = true;
    }
    decoder.validate("|");
  }
}

template<>
std::string internal::encode_entity(const Data& entity) {
  internal::StringEncoder encoder;
  encoder.encode("", entity._internal_id());
  if (entity.has_num())
    encoder.encode("num:N", entity.num());
  if (entity.has_txt())
    encoder.encode("txt:T", entity.txt());
  if (entity.has_lnk())
    encoder.encode("lnk:U", entity.lnk());
  if (entity.has_flg())
    encoder.encode("flg:B", entity.flg());
  return std::move(encoder.result());
}

}  // namespace arcs

// For STL unordered associative containers. Entities will need to be std::move()-inserted.
template<>
struct std::hash<arcs::Data> {
  size_t operator()(const arcs::Data& entity) const {
    return std::hash<std::string>()(entity._internal_id());
  }
};

namespace arcs {

class SpecialFields {
public:
  // Entities must be copied with arcs::clone_entity(), which will exclude the internal id.
  // Move operations are ok (and will include the internal id).
  SpecialFields() = default;
  SpecialFields(SpecialFields&&) = default;
  SpecialFields& operator=(SpecialFields&&) = default;

  const std::string& _for() const { return for_; }
  void set_for(const std::string& value) { for_ = value; for_valid_ = true; }
  void clear_for() { for_ = std::string(); for_valid_ = false; }
  bool has_for() const { return for_valid_; }

  double internal_id() const { return internal_id_; }
  void set_internal_id(double value) { internal_id_ = value; internal_id_valid_ = true; }
  void clear_internal_id() { internal_id_ = double(); internal_id_valid_ = false; }
  bool has_internal_id() const { return internal_id_valid_; }

  // Equality is based only on the internal id. Use arcs::entities_equal() to compare fields.
  bool operator==(const SpecialFields& other) const { return _internal_id_ == other._internal_id_; }
  bool operator!=(const SpecialFields& other) const { return _internal_id_ != other._internal_id_; }

  // For STL containers.
  friend bool operator<(const SpecialFields& a, const SpecialFields& b) { return a._internal_id_ < b._internal_id_; }

  // For testing and debugging only; do not use this value for any production purpose.
  const std::string& _internal_id() const { return _internal_id_; }

private:
  // Allow private copying for use in Handles.
  SpecialFields(const SpecialFields&) = default;
  SpecialFields& operator=(const SpecialFields&) = default;

  std::string for_ = std::string();
  bool for_valid_ = false;

  double internal_id_ = double();
  bool internal_id_valid_ = false;

  std::string _internal_id_;
  static const int _FIELD_COUNT = 2;

  friend class Singleton<SpecialFields>;
  friend class Collection<SpecialFields>;
  friend SpecialFields clone_entity<SpecialFields>(const SpecialFields& entity);
  friend void internal::decode_entity<SpecialFields>(SpecialFields* entity, const char* str);
};

template<>
SpecialFields clone_entity(const SpecialFields& entity) {
  SpecialFields clone;
  clone.for_ = entity.for_;
  clone.for_valid_ = entity.for_valid_;
  clone.internal_id_ = entity.internal_id_;
  clone.internal_id_valid_ = entity.internal_id_valid_;
  return std::move(clone);
}

template<>
bool entities_equal(const SpecialFields& a, const SpecialFields& b) {
  return (a.has_for() ? (b.has_for() && a._for() == b._for()) : !b.has_for()) &&
         (a.has_internal_id() ? (b.has_internal_id() && a.internal_id() == b.internal_id()) : !b.has_internal_id());
}

template<>
std::string entity_to_str(const SpecialFields& entity, const char* join) {
  internal::StringPrinter printer;
  printer.addId(entity._internal_id());
  if (entity.has_for())
    printer.add("for: ", entity._for());
  if (entity.has_internal_id())
    printer.add("internal_id: ", entity.internal_id());
  return std::move(printer.result(join));
}

template<>
void internal::decode_entity(SpecialFields* entity, const char* str) {
  if (str == nullptr) return;
  internal::StringDecoder decoder(str);
  decoder.decode(entity->_internal_id_);
  decoder.validate("|");
  for (int i = 0; !decoder.done() && i < SpecialFields::_FIELD_COUNT; i++) {
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
std::string internal::encode_entity(const SpecialFields& entity) {
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
struct std::hash<arcs::SpecialFields> {
  size_t operator()(const arcs::SpecialFields& entity) const {
    return std::hash<std::string>()(entity._internal_id());
  }
};

#endif
