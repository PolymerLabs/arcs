#ifndef _ARCS_MANIFEST_H
#define _ARCS_MANIFEST_H

// GENERATED CODE - DO NOT EDIT

namespace arcs {

// Aliased as HandleSyncUpdateTest_Sng_Ref, HandleSyncUpdateTest_Col_Ref
class HandleSyncUpdateTestInternal1 {
public:
  // Entities must be copied with arcs::clone_entity(), which will exclude the internal id.
  // Move operations are ok (and will include the internal id).
  HandleSyncUpdateTestInternal1() = default;
  HandleSyncUpdateTestInternal1(HandleSyncUpdateTestInternal1&&) = default;
  HandleSyncUpdateTestInternal1& operator=(HandleSyncUpdateTestInternal1&&) = default;

  template<typename T>
  HandleSyncUpdateTestInternal1(const T& other) :
    val_(other.val()), val_valid_(other.has_val())
  {}

  const std::string& val() const { return val_; }
  void set_val(const std::string& value) { val_ = value; val_valid_ = true; }
  void clear_val() { val_ = ""; val_valid_ = false; }
  bool has_val() const { return val_valid_; }

  // Equality ops compare internal ids and all data fields.
  // Use arcs::fields_equal() to compare only the data fields.
  bool operator==(const HandleSyncUpdateTestInternal1& other) const;
  bool operator!=(const HandleSyncUpdateTestInternal1& other) const { return !(*this == other); }

  // For STL containers.
  friend bool operator<(const HandleSyncUpdateTestInternal1& a, const HandleSyncUpdateTestInternal1& b) {
    int cmp = a._internal_id_.compare(b._internal_id_);
    if (cmp != 0) return cmp < 0;
    if (a.val_valid_ != b.val_valid_) {
      return !a.val_valid_;
    } else {
      cmp = a.val_.compare(b.val_);
      if (cmp != 0) return cmp < 0;
    };
    return false;
  }

protected:
  // Allow private copying for use in Handles.
  HandleSyncUpdateTestInternal1(const HandleSyncUpdateTestInternal1&) = default;
  HandleSyncUpdateTestInternal1& operator=(const HandleSyncUpdateTestInternal1&) = default;

  static const char* _schema_hash() { return "a98c1c524edca305a86475ecf09e531a8be458df"; }
  static const int _field_count = 1;

  std::string val_ = "";
  bool val_valid_ = false;

  std::string _internal_id_;

  friend class Singleton<HandleSyncUpdateTestInternal1>;
  friend class Collection<HandleSyncUpdateTestInternal1>;
  friend class Ref<HandleSyncUpdateTestInternal1>;
  friend class internal::Accessor;
};

using HandleSyncUpdateTest_Sng_Ref = HandleSyncUpdateTestInternal1;
using HandleSyncUpdateTest_Col_Ref = HandleSyncUpdateTestInternal1;

template<>
inline HandleSyncUpdateTestInternal1 internal::Accessor::clone_entity(const HandleSyncUpdateTestInternal1& entity) {
  HandleSyncUpdateTestInternal1 clone;
  clone.val_ = entity.val_;
  clone.val_valid_ = entity.val_valid_;
  return clone;
}

template<>
inline size_t internal::Accessor::hash_entity(const HandleSyncUpdateTestInternal1& entity) {
  size_t h = 0;
  internal::hash_combine(h, entity._internal_id_);
  if (entity.val_valid_)
    internal::hash_combine(h, entity.val_);
  return h;
}

template<>
inline bool internal::Accessor::fields_equal(const HandleSyncUpdateTestInternal1& a, const HandleSyncUpdateTestInternal1& b) {
  return (a.val_valid_ ? (b.val_valid_ && a.val_ == b.val_) : !b.val_valid_);
}

inline bool HandleSyncUpdateTestInternal1::operator==(const HandleSyncUpdateTestInternal1& other) const {
  return _internal_id_ == other._internal_id_ && fields_equal(*this, other);
}

template<>
inline std::string internal::Accessor::entity_to_str(const HandleSyncUpdateTestInternal1& entity, const char* join) {
  internal::StringPrinter printer;
  printer.addId(entity._internal_id_);
  if (entity.val_valid_)
    printer.add("val: ", entity.val_);
  return printer.result(join);
}

template<>
inline void internal::Accessor::decode_entity(HandleSyncUpdateTestInternal1* entity, const char* str) {
  if (str == nullptr) return;
  internal::StringDecoder decoder(str);
  decoder.decode(entity->_internal_id_);
  decoder.validate("|");
  for (int i = 0; !decoder.done() && i < HandleSyncUpdateTestInternal1::_field_count; i++) {
    std::string name = decoder.upTo(':');
    if (0) {
    } else if (name == "val") {
      decoder.validate("T");
      decoder.decode(entity->val_);
      entity->val_valid_ = true;
    }
    decoder.validate("|");
  }
}

template<>
inline std::string internal::Accessor::encode_entity(const HandleSyncUpdateTestInternal1& entity) {
  internal::StringEncoder encoder;
  encoder.encode("", entity._internal_id_);
  if (entity.val_valid_)
    encoder.encode("val:T", entity.val_);
  return encoder.result();
}

}  // namespace arcs

// For STL unordered associative containers. Entities will need to be std::move()-inserted.
template<>
struct std::hash<arcs::HandleSyncUpdateTestInternal1> {
  size_t operator()(const arcs::HandleSyncUpdateTestInternal1& entity) const {
    return arcs::hash_entity(entity);
  }
};

namespace arcs {

class HandleSyncUpdateTest_Res {
public:
  // Entities must be copied with arcs::clone_entity(), which will exclude the internal id.
  // Move operations are ok (and will include the internal id).
  HandleSyncUpdateTest_Res() = default;
  HandleSyncUpdateTest_Res(HandleSyncUpdateTest_Res&&) = default;
  HandleSyncUpdateTest_Res& operator=(HandleSyncUpdateTest_Res&&) = default;

  template<typename T>
  HandleSyncUpdateTest_Res(const T& other) :
    txt_(other.txt()), txt_valid_(other.has_txt()),
    num_(other.num()), num_valid_(other.has_num())
  {}

  const std::string& txt() const { return txt_; }
  void set_txt(const std::string& value) { txt_ = value; txt_valid_ = true; }
  void clear_txt() { txt_ = ""; txt_valid_ = false; }
  bool has_txt() const { return txt_valid_; }

  double num() const { return num_; }
  void set_num(double value) { num_ = value; num_valid_ = true; }
  void clear_num() { num_ = 0; num_valid_ = false; }
  bool has_num() const { return num_valid_; }

  // Equality ops compare internal ids and all data fields.
  // Use arcs::fields_equal() to compare only the data fields.
  bool operator==(const HandleSyncUpdateTest_Res& other) const;
  bool operator!=(const HandleSyncUpdateTest_Res& other) const { return !(*this == other); }

  // For STL containers.
  friend bool operator<(const HandleSyncUpdateTest_Res& a, const HandleSyncUpdateTest_Res& b) {
    int cmp = a._internal_id_.compare(b._internal_id_);
    if (cmp != 0) return cmp < 0;
    if (a.txt_valid_ != b.txt_valid_) {
      return !a.txt_valid_;
    } else {
      cmp = a.txt_.compare(b.txt_);
      if (cmp != 0) return cmp < 0;
    }
    if (a.num_valid_ != b.num_valid_) {
      return !a.num_valid_;
    } else if (a.num_ != b.num_) {
      return a.num_ < b.num_;
    };
    return false;
  }

protected:
  // Allow private copying for use in Handles.
  HandleSyncUpdateTest_Res(const HandleSyncUpdateTest_Res&) = default;
  HandleSyncUpdateTest_Res& operator=(const HandleSyncUpdateTest_Res&) = default;

  static const char* _schema_hash() { return "b3f278f670fd972c8bac1e3b862505430da66810"; }
  static const int _field_count = 2;

  std::string txt_ = "";
  bool txt_valid_ = false;

  double num_ = 0;
  bool num_valid_ = false;

  std::string _internal_id_;

  friend class Singleton<HandleSyncUpdateTest_Res>;
  friend class Collection<HandleSyncUpdateTest_Res>;
  friend class Ref<HandleSyncUpdateTest_Res>;
  friend class internal::Accessor;
};

template<>
inline HandleSyncUpdateTest_Res internal::Accessor::clone_entity(const HandleSyncUpdateTest_Res& entity) {
  HandleSyncUpdateTest_Res clone;
  clone.txt_ = entity.txt_;
  clone.txt_valid_ = entity.txt_valid_;
  clone.num_ = entity.num_;
  clone.num_valid_ = entity.num_valid_;
  return clone;
}

template<>
inline size_t internal::Accessor::hash_entity(const HandleSyncUpdateTest_Res& entity) {
  size_t h = 0;
  internal::hash_combine(h, entity._internal_id_);
  if (entity.txt_valid_)
    internal::hash_combine(h, entity.txt_);
  if (entity.num_valid_)
    internal::hash_combine(h, entity.num_);
  return h;
}

template<>
inline bool internal::Accessor::fields_equal(const HandleSyncUpdateTest_Res& a, const HandleSyncUpdateTest_Res& b) {
  return (a.txt_valid_ ? (b.txt_valid_ && a.txt_ == b.txt_) : !b.txt_valid_) &&
         (a.num_valid_ ? (b.num_valid_ && a.num_ == b.num_) : !b.num_valid_);
}

inline bool HandleSyncUpdateTest_Res::operator==(const HandleSyncUpdateTest_Res& other) const {
  return _internal_id_ == other._internal_id_ && fields_equal(*this, other);
}

template<>
inline std::string internal::Accessor::entity_to_str(const HandleSyncUpdateTest_Res& entity, const char* join) {
  internal::StringPrinter printer;
  printer.addId(entity._internal_id_);
  if (entity.txt_valid_)
    printer.add("txt: ", entity.txt_);
  if (entity.num_valid_)
    printer.add("num: ", entity.num_);
  return printer.result(join);
}

template<>
inline void internal::Accessor::decode_entity(HandleSyncUpdateTest_Res* entity, const char* str) {
  if (str == nullptr) return;
  internal::StringDecoder decoder(str);
  decoder.decode(entity->_internal_id_);
  decoder.validate("|");
  for (int i = 0; !decoder.done() && i < HandleSyncUpdateTest_Res::_field_count; i++) {
    std::string name = decoder.upTo(':');
    if (0) {
    } else if (name == "txt") {
      decoder.validate("T");
      decoder.decode(entity->txt_);
      entity->txt_valid_ = true;
    } else if (name == "num") {
      decoder.validate("N");
      decoder.decode(entity->num_);
      entity->num_valid_ = true;
    }
    decoder.validate("|");
  }
}

template<>
inline std::string internal::Accessor::encode_entity(const HandleSyncUpdateTest_Res& entity) {
  internal::StringEncoder encoder;
  encoder.encode("", entity._internal_id_);
  if (entity.txt_valid_)
    encoder.encode("txt:T", entity.txt_);
  if (entity.num_valid_)
    encoder.encode("num:N", entity.num_);
  return encoder.result();
}

}  // namespace arcs

// For STL unordered associative containers. Entities will need to be std::move()-inserted.
template<>
struct std::hash<arcs::HandleSyncUpdateTest_Res> {
  size_t operator()(const arcs::HandleSyncUpdateTest_Res& entity) const {
    return arcs::hash_entity(entity);
  }
};

namespace arcs {

// Aliased as HandleSyncUpdateTest_Sng, HandleSyncUpdateTest_Col
class HandleSyncUpdateTestInternal2 {
public:
  // Entities must be copied with arcs::clone_entity(), which will exclude the internal id.
  // Move operations are ok (and will include the internal id).
  HandleSyncUpdateTestInternal2() = default;
  HandleSyncUpdateTestInternal2(HandleSyncUpdateTestInternal2&&) = default;
  HandleSyncUpdateTestInternal2& operator=(HandleSyncUpdateTestInternal2&&) = default;

  template<typename T>
  HandleSyncUpdateTestInternal2(const T& other) :
    num_(other.num()), num_valid_(other.has_num()),
    txt_(other.txt()), txt_valid_(other.has_txt()),
    lnk_(other.lnk()), lnk_valid_(other.has_lnk()),
    flg_(other.flg()), flg_valid_(other.has_flg()),
    ref_(other.ref())
  {}

  double num() const { return num_; }
  void set_num(double value) { num_ = value; num_valid_ = true; }
  void clear_num() { num_ = 0; num_valid_ = false; }
  bool has_num() const { return num_valid_; }

  const std::string& txt() const { return txt_; }
  void set_txt(const std::string& value) { txt_ = value; txt_valid_ = true; }
  void clear_txt() { txt_ = ""; txt_valid_ = false; }
  bool has_txt() const { return txt_valid_; }

  const URL& lnk() const { return lnk_; }
  void set_lnk(const URL& value) { lnk_ = value; lnk_valid_ = true; }
  void clear_lnk() { lnk_ = ""; lnk_valid_ = false; }
  bool has_lnk() const { return lnk_valid_; }

  bool flg() const { return flg_; }
  void set_flg(bool value) { flg_ = value; flg_valid_ = true; }
  void clear_flg() { flg_ = false; flg_valid_ = false; }
  bool has_flg() const { return flg_valid_; }

  const Ref<HandleSyncUpdateTestInternal1>& ref() const { return ref_; }
  void bind_ref(const HandleSyncUpdateTestInternal1& value) { internal::Accessor::bind(&ref_, value); }

  // Equality ops compare internal ids and all data fields.
  // Use arcs::fields_equal() to compare only the data fields.
  bool operator==(const HandleSyncUpdateTestInternal2& other) const;
  bool operator!=(const HandleSyncUpdateTestInternal2& other) const { return !(*this == other); }

  // For STL containers.
  friend bool operator<(const HandleSyncUpdateTestInternal2& a, const HandleSyncUpdateTestInternal2& b) {
    int cmp = a._internal_id_.compare(b._internal_id_);
    if (cmp != 0) return cmp < 0;
    if (a.num_valid_ != b.num_valid_) {
      return !a.num_valid_;
    } else if (a.num_ != b.num_) {
      return a.num_ < b.num_;
    }
    if (a.txt_valid_ != b.txt_valid_) {
      return !a.txt_valid_;
    } else {
      cmp = a.txt_.compare(b.txt_);
      if (cmp != 0) return cmp < 0;
    }
    if (a.lnk_valid_ != b.lnk_valid_) {
      return !a.lnk_valid_;
    } else {
      cmp = a.lnk_.compare(b.lnk_);
      if (cmp != 0) return cmp < 0;
    }
    if (a.flg_valid_ != b.flg_valid_) {
      return !a.flg_valid_;
    } else if (a.flg_ != b.flg_) {
      return a.flg_ < b.flg_;
    }
    if (a.ref_ != b.ref_) {
      return a.ref_ < b.ref_;
    };
    return false;
  }

protected:
  // Allow private copying for use in Handles.
  HandleSyncUpdateTestInternal2(const HandleSyncUpdateTestInternal2&) = default;
  HandleSyncUpdateTestInternal2& operator=(const HandleSyncUpdateTestInternal2&) = default;

  static const char* _schema_hash() { return "7ce9e3f97cae5dc6b9570724bbdd33fd8b1ef930"; }
  static const int _field_count = 5;

  double num_ = 0;
  bool num_valid_ = false;

  std::string txt_ = "";
  bool txt_valid_ = false;

  URL lnk_ = "";
  bool lnk_valid_ = false;

  bool flg_ = false;
  bool flg_valid_ = false;

  Ref<HandleSyncUpdateTestInternal1> ref_;

  std::string _internal_id_;

  friend class Singleton<HandleSyncUpdateTestInternal2>;
  friend class Collection<HandleSyncUpdateTestInternal2>;
  friend class Ref<HandleSyncUpdateTestInternal2>;
  friend class internal::Accessor;
};

using HandleSyncUpdateTest_Sng = HandleSyncUpdateTestInternal2;
using HandleSyncUpdateTest_Col = HandleSyncUpdateTestInternal2;

template<>
inline HandleSyncUpdateTestInternal2 internal::Accessor::clone_entity(const HandleSyncUpdateTestInternal2& entity) {
  HandleSyncUpdateTestInternal2 clone;
  clone.num_ = entity.num_;
  clone.num_valid_ = entity.num_valid_;
  clone.txt_ = entity.txt_;
  clone.txt_valid_ = entity.txt_valid_;
  clone.lnk_ = entity.lnk_;
  clone.lnk_valid_ = entity.lnk_valid_;
  clone.flg_ = entity.flg_;
  clone.flg_valid_ = entity.flg_valid_;
  clone.ref_ = entity.ref_;
  return clone;
}

template<>
inline size_t internal::Accessor::hash_entity(const HandleSyncUpdateTestInternal2& entity) {
  size_t h = 0;
  internal::hash_combine(h, entity._internal_id_);
  if (entity.num_valid_)
    internal::hash_combine(h, entity.num_);
  if (entity.txt_valid_)
    internal::hash_combine(h, entity.txt_);
  if (entity.lnk_valid_)
    internal::hash_combine(h, entity.lnk_);
  if (entity.flg_valid_)
    internal::hash_combine(h, entity.flg_);
  if (entity.ref_._internal_id_ != "")
    internal::hash_combine(h, entity.ref_);
  return h;
}

template<>
inline bool internal::Accessor::fields_equal(const HandleSyncUpdateTestInternal2& a, const HandleSyncUpdateTestInternal2& b) {
  return (a.num_valid_ ? (b.num_valid_ && a.num_ == b.num_) : !b.num_valid_) &&
         (a.txt_valid_ ? (b.txt_valid_ && a.txt_ == b.txt_) : !b.txt_valid_) &&
         (a.lnk_valid_ ? (b.lnk_valid_ && a.lnk_ == b.lnk_) : !b.lnk_valid_) &&
         (a.flg_valid_ ? (b.flg_valid_ && a.flg_ == b.flg_) : !b.flg_valid_) &&
         (a.ref_ == b.ref_);
}

inline bool HandleSyncUpdateTestInternal2::operator==(const HandleSyncUpdateTestInternal2& other) const {
  return _internal_id_ == other._internal_id_ && fields_equal(*this, other);
}

template<>
inline std::string internal::Accessor::entity_to_str(const HandleSyncUpdateTestInternal2& entity, const char* join) {
  internal::StringPrinter printer;
  printer.addId(entity._internal_id_);
  if (entity.num_valid_)
    printer.add("num: ", entity.num_);
  if (entity.txt_valid_)
    printer.add("txt: ", entity.txt_);
  if (entity.lnk_valid_)
    printer.add("lnk: ", entity.lnk_);
  if (entity.flg_valid_)
    printer.add("flg: ", entity.flg_);
  if (entity.ref_._internal_id_ != "")
    printer.add("ref: ", entity.ref_);
  return printer.result(join);
}

template<>
inline void internal::Accessor::decode_entity(HandleSyncUpdateTestInternal2* entity, const char* str) {
  if (str == nullptr) return;
  internal::StringDecoder decoder(str);
  decoder.decode(entity->_internal_id_);
  decoder.validate("|");
  for (int i = 0; !decoder.done() && i < HandleSyncUpdateTestInternal2::_field_count; i++) {
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
    } else if (name == "ref") {
      decoder.validate("R");
      decoder.decode(entity->ref_);
    }
    decoder.validate("|");
  }
}

template<>
inline std::string internal::Accessor::encode_entity(const HandleSyncUpdateTestInternal2& entity) {
  internal::StringEncoder encoder;
  encoder.encode("", entity._internal_id_);
  if (entity.num_valid_)
    encoder.encode("num:N", entity.num_);
  if (entity.txt_valid_)
    encoder.encode("txt:T", entity.txt_);
  if (entity.lnk_valid_)
    encoder.encode("lnk:U", entity.lnk_);
  if (entity.flg_valid_)
    encoder.encode("flg:B", entity.flg_);
  if (entity.ref_._internal_id_ != "")
    encoder.encode("ref:R", entity.ref_);
  return encoder.result();
}

}  // namespace arcs

// For STL unordered associative containers. Entities will need to be std::move()-inserted.
template<>
struct std::hash<arcs::HandleSyncUpdateTestInternal2> {
  size_t operator()(const arcs::HandleSyncUpdateTestInternal2& entity) const {
    return arcs::hash_entity(entity);
  }
};

namespace arcs {

class RenderTest_Flags {
public:
  // Entities must be copied with arcs::clone_entity(), which will exclude the internal id.
  // Move operations are ok (and will include the internal id).
  RenderTest_Flags() = default;
  RenderTest_Flags(RenderTest_Flags&&) = default;
  RenderTest_Flags& operator=(RenderTest_Flags&&) = default;

  template<typename T>
  RenderTest_Flags(const T& other) :
    template_(other._template()), template_valid_(other.has_template()),
    model_(other.model()), model_valid_(other.has_model())
  {}

  bool _template() const { return template_; }
  void set_template(bool value) { template_ = value; template_valid_ = true; }
  void clear_template() { template_ = false; template_valid_ = false; }
  bool has_template() const { return template_valid_; }

  bool model() const { return model_; }
  void set_model(bool value) { model_ = value; model_valid_ = true; }
  void clear_model() { model_ = false; model_valid_ = false; }
  bool has_model() const { return model_valid_; }

  // Equality ops compare internal ids and all data fields.
  // Use arcs::fields_equal() to compare only the data fields.
  bool operator==(const RenderTest_Flags& other) const;
  bool operator!=(const RenderTest_Flags& other) const { return !(*this == other); }

  // For STL containers.
  friend bool operator<(const RenderTest_Flags& a, const RenderTest_Flags& b) {
    int cmp = a._internal_id_.compare(b._internal_id_);
    if (cmp != 0) return cmp < 0;
    if (a.template_valid_ != b.template_valid_) {
      return !a.template_valid_;
    } else if (a.template_ != b.template_) {
      return a.template_ < b.template_;
    }
    if (a.model_valid_ != b.model_valid_) {
      return !a.model_valid_;
    } else if (a.model_ != b.model_) {
      return a.model_ < b.model_;
    };
    return false;
  }

protected:
  // Allow private copying for use in Handles.
  RenderTest_Flags(const RenderTest_Flags&) = default;
  RenderTest_Flags& operator=(const RenderTest_Flags&) = default;

  static const char* _schema_hash() { return "e44b4cba09d05e363bf939e5e88b3d53f44798eb"; }
  static const int _field_count = 2;

  bool template_ = false;
  bool template_valid_ = false;

  bool model_ = false;
  bool model_valid_ = false;

  std::string _internal_id_;

  friend class Singleton<RenderTest_Flags>;
  friend class Collection<RenderTest_Flags>;
  friend class Ref<RenderTest_Flags>;
  friend class internal::Accessor;
};

template<>
inline RenderTest_Flags internal::Accessor::clone_entity(const RenderTest_Flags& entity) {
  RenderTest_Flags clone;
  clone.template_ = entity.template_;
  clone.template_valid_ = entity.template_valid_;
  clone.model_ = entity.model_;
  clone.model_valid_ = entity.model_valid_;
  return clone;
}

template<>
inline size_t internal::Accessor::hash_entity(const RenderTest_Flags& entity) {
  size_t h = 0;
  internal::hash_combine(h, entity._internal_id_);
  if (entity.template_valid_)
    internal::hash_combine(h, entity.template_);
  if (entity.model_valid_)
    internal::hash_combine(h, entity.model_);
  return h;
}

template<>
inline bool internal::Accessor::fields_equal(const RenderTest_Flags& a, const RenderTest_Flags& b) {
  return (a.template_valid_ ? (b.template_valid_ && a.template_ == b.template_) : !b.template_valid_) &&
         (a.model_valid_ ? (b.model_valid_ && a.model_ == b.model_) : !b.model_valid_);
}

inline bool RenderTest_Flags::operator==(const RenderTest_Flags& other) const {
  return _internal_id_ == other._internal_id_ && fields_equal(*this, other);
}

template<>
inline std::string internal::Accessor::entity_to_str(const RenderTest_Flags& entity, const char* join) {
  internal::StringPrinter printer;
  printer.addId(entity._internal_id_);
  if (entity.template_valid_)
    printer.add("template: ", entity.template_);
  if (entity.model_valid_)
    printer.add("model: ", entity.model_);
  return printer.result(join);
}

template<>
inline void internal::Accessor::decode_entity(RenderTest_Flags* entity, const char* str) {
  if (str == nullptr) return;
  internal::StringDecoder decoder(str);
  decoder.decode(entity->_internal_id_);
  decoder.validate("|");
  for (int i = 0; !decoder.done() && i < RenderTest_Flags::_field_count; i++) {
    std::string name = decoder.upTo(':');
    if (0) {
    } else if (name == "template") {
      decoder.validate("B");
      decoder.decode(entity->template_);
      entity->template_valid_ = true;
    } else if (name == "model") {
      decoder.validate("B");
      decoder.decode(entity->model_);
      entity->model_valid_ = true;
    }
    decoder.validate("|");
  }
}

template<>
inline std::string internal::Accessor::encode_entity(const RenderTest_Flags& entity) {
  internal::StringEncoder encoder;
  encoder.encode("", entity._internal_id_);
  if (entity.template_valid_)
    encoder.encode("template:B", entity.template_);
  if (entity.model_valid_)
    encoder.encode("model:B", entity.model_);
  return encoder.result();
}

}  // namespace arcs

// For STL unordered associative containers. Entities will need to be std::move()-inserted.
template<>
struct std::hash<arcs::RenderTest_Flags> {
  size_t operator()(const arcs::RenderTest_Flags& entity) const {
    return arcs::hash_entity(entity);
  }
};

namespace arcs {

class AutoRenderTest_Data {
public:
  // Entities must be copied with arcs::clone_entity(), which will exclude the internal id.
  // Move operations are ok (and will include the internal id).
  AutoRenderTest_Data() = default;
  AutoRenderTest_Data(AutoRenderTest_Data&&) = default;
  AutoRenderTest_Data& operator=(AutoRenderTest_Data&&) = default;

  template<typename T>
  AutoRenderTest_Data(const T& other) :
    txt_(other.txt()), txt_valid_(other.has_txt())
  {}

  const std::string& txt() const { return txt_; }
  void set_txt(const std::string& value) { txt_ = value; txt_valid_ = true; }
  void clear_txt() { txt_ = ""; txt_valid_ = false; }
  bool has_txt() const { return txt_valid_; }

  // Equality ops compare internal ids and all data fields.
  // Use arcs::fields_equal() to compare only the data fields.
  bool operator==(const AutoRenderTest_Data& other) const;
  bool operator!=(const AutoRenderTest_Data& other) const { return !(*this == other); }

  // For STL containers.
  friend bool operator<(const AutoRenderTest_Data& a, const AutoRenderTest_Data& b) {
    int cmp = a._internal_id_.compare(b._internal_id_);
    if (cmp != 0) return cmp < 0;
    if (a.txt_valid_ != b.txt_valid_) {
      return !a.txt_valid_;
    } else {
      cmp = a.txt_.compare(b.txt_);
      if (cmp != 0) return cmp < 0;
    };
    return false;
  }

protected:
  // Allow private copying for use in Handles.
  AutoRenderTest_Data(const AutoRenderTest_Data&) = default;
  AutoRenderTest_Data& operator=(const AutoRenderTest_Data&) = default;

  static const char* _schema_hash() { return "5c7dd9d914c51f339663d61e3c5065047540ddfb"; }
  static const int _field_count = 1;

  std::string txt_ = "";
  bool txt_valid_ = false;

  std::string _internal_id_;

  friend class Singleton<AutoRenderTest_Data>;
  friend class Collection<AutoRenderTest_Data>;
  friend class Ref<AutoRenderTest_Data>;
  friend class internal::Accessor;
};

template<>
inline AutoRenderTest_Data internal::Accessor::clone_entity(const AutoRenderTest_Data& entity) {
  AutoRenderTest_Data clone;
  clone.txt_ = entity.txt_;
  clone.txt_valid_ = entity.txt_valid_;
  return clone;
}

template<>
inline size_t internal::Accessor::hash_entity(const AutoRenderTest_Data& entity) {
  size_t h = 0;
  internal::hash_combine(h, entity._internal_id_);
  if (entity.txt_valid_)
    internal::hash_combine(h, entity.txt_);
  return h;
}

template<>
inline bool internal::Accessor::fields_equal(const AutoRenderTest_Data& a, const AutoRenderTest_Data& b) {
  return (a.txt_valid_ ? (b.txt_valid_ && a.txt_ == b.txt_) : !b.txt_valid_);
}

inline bool AutoRenderTest_Data::operator==(const AutoRenderTest_Data& other) const {
  return _internal_id_ == other._internal_id_ && fields_equal(*this, other);
}

template<>
inline std::string internal::Accessor::entity_to_str(const AutoRenderTest_Data& entity, const char* join) {
  internal::StringPrinter printer;
  printer.addId(entity._internal_id_);
  if (entity.txt_valid_)
    printer.add("txt: ", entity.txt_);
  return printer.result(join);
}

template<>
inline void internal::Accessor::decode_entity(AutoRenderTest_Data* entity, const char* str) {
  if (str == nullptr) return;
  internal::StringDecoder decoder(str);
  decoder.decode(entity->_internal_id_);
  decoder.validate("|");
  for (int i = 0; !decoder.done() && i < AutoRenderTest_Data::_field_count; i++) {
    std::string name = decoder.upTo(':');
    if (0) {
    } else if (name == "txt") {
      decoder.validate("T");
      decoder.decode(entity->txt_);
      entity->txt_valid_ = true;
    }
    decoder.validate("|");
  }
}

template<>
inline std::string internal::Accessor::encode_entity(const AutoRenderTest_Data& entity) {
  internal::StringEncoder encoder;
  encoder.encode("", entity._internal_id_);
  if (entity.txt_valid_)
    encoder.encode("txt:T", entity.txt_);
  return encoder.result();
}

}  // namespace arcs

// For STL unordered associative containers. Entities will need to be std::move()-inserted.
template<>
struct std::hash<arcs::AutoRenderTest_Data> {
  size_t operator()(const arcs::AutoRenderTest_Data& entity) const {
    return arcs::hash_entity(entity);
  }
};

namespace arcs {

class EventsTest_Output {
public:
  // Entities must be copied with arcs::clone_entity(), which will exclude the internal id.
  // Move operations are ok (and will include the internal id).
  EventsTest_Output() = default;
  EventsTest_Output(EventsTest_Output&&) = default;
  EventsTest_Output& operator=(EventsTest_Output&&) = default;

  template<typename T>
  EventsTest_Output(const T& other) :
    txt_(other.txt()), txt_valid_(other.has_txt())
  {}

  const std::string& txt() const { return txt_; }
  void set_txt(const std::string& value) { txt_ = value; txt_valid_ = true; }
  void clear_txt() { txt_ = ""; txt_valid_ = false; }
  bool has_txt() const { return txt_valid_; }

  // Equality ops compare internal ids and all data fields.
  // Use arcs::fields_equal() to compare only the data fields.
  bool operator==(const EventsTest_Output& other) const;
  bool operator!=(const EventsTest_Output& other) const { return !(*this == other); }

  // For STL containers.
  friend bool operator<(const EventsTest_Output& a, const EventsTest_Output& b) {
    int cmp = a._internal_id_.compare(b._internal_id_);
    if (cmp != 0) return cmp < 0;
    if (a.txt_valid_ != b.txt_valid_) {
      return !a.txt_valid_;
    } else {
      cmp = a.txt_.compare(b.txt_);
      if (cmp != 0) return cmp < 0;
    };
    return false;
  }

protected:
  // Allow private copying for use in Handles.
  EventsTest_Output(const EventsTest_Output&) = default;
  EventsTest_Output& operator=(const EventsTest_Output&) = default;

  static const char* _schema_hash() { return "5c7dd9d914c51f339663d61e3c5065047540ddfb"; }
  static const int _field_count = 1;

  std::string txt_ = "";
  bool txt_valid_ = false;

  std::string _internal_id_;

  friend class Singleton<EventsTest_Output>;
  friend class Collection<EventsTest_Output>;
  friend class Ref<EventsTest_Output>;
  friend class internal::Accessor;
};

template<>
inline EventsTest_Output internal::Accessor::clone_entity(const EventsTest_Output& entity) {
  EventsTest_Output clone;
  clone.txt_ = entity.txt_;
  clone.txt_valid_ = entity.txt_valid_;
  return clone;
}

template<>
inline size_t internal::Accessor::hash_entity(const EventsTest_Output& entity) {
  size_t h = 0;
  internal::hash_combine(h, entity._internal_id_);
  if (entity.txt_valid_)
    internal::hash_combine(h, entity.txt_);
  return h;
}

template<>
inline bool internal::Accessor::fields_equal(const EventsTest_Output& a, const EventsTest_Output& b) {
  return (a.txt_valid_ ? (b.txt_valid_ && a.txt_ == b.txt_) : !b.txt_valid_);
}

inline bool EventsTest_Output::operator==(const EventsTest_Output& other) const {
  return _internal_id_ == other._internal_id_ && fields_equal(*this, other);
}

template<>
inline std::string internal::Accessor::entity_to_str(const EventsTest_Output& entity, const char* join) {
  internal::StringPrinter printer;
  printer.addId(entity._internal_id_);
  if (entity.txt_valid_)
    printer.add("txt: ", entity.txt_);
  return printer.result(join);
}

template<>
inline void internal::Accessor::decode_entity(EventsTest_Output* entity, const char* str) {
  if (str == nullptr) return;
  internal::StringDecoder decoder(str);
  decoder.decode(entity->_internal_id_);
  decoder.validate("|");
  for (int i = 0; !decoder.done() && i < EventsTest_Output::_field_count; i++) {
    std::string name = decoder.upTo(':');
    if (0) {
    } else if (name == "txt") {
      decoder.validate("T");
      decoder.decode(entity->txt_);
      entity->txt_valid_ = true;
    }
    decoder.validate("|");
  }
}

template<>
inline std::string internal::Accessor::encode_entity(const EventsTest_Output& entity) {
  internal::StringEncoder encoder;
  encoder.encode("", entity._internal_id_);
  if (entity.txt_valid_)
    encoder.encode("txt:T", entity.txt_);
  return encoder.result();
}

}  // namespace arcs

// For STL unordered associative containers. Entities will need to be std::move()-inserted.
template<>
struct std::hash<arcs::EventsTest_Output> {
  size_t operator()(const arcs::EventsTest_Output& entity) const {
    return arcs::hash_entity(entity);
  }
};

namespace arcs {

class ServicesTest_Output {
public:
  // Entities must be copied with arcs::clone_entity(), which will exclude the internal id.
  // Move operations are ok (and will include the internal id).
  ServicesTest_Output() = default;
  ServicesTest_Output(ServicesTest_Output&&) = default;
  ServicesTest_Output& operator=(ServicesTest_Output&&) = default;

  template<typename T>
  ServicesTest_Output(const T& other) :
    call_(other.call()), call_valid_(other.has_call()),
    tag_(other.tag()), tag_valid_(other.has_tag()),
    payload_(other.payload()), payload_valid_(other.has_payload())
  {}

  const std::string& call() const { return call_; }
  void set_call(const std::string& value) { call_ = value; call_valid_ = true; }
  void clear_call() { call_ = ""; call_valid_ = false; }
  bool has_call() const { return call_valid_; }

  const std::string& tag() const { return tag_; }
  void set_tag(const std::string& value) { tag_ = value; tag_valid_ = true; }
  void clear_tag() { tag_ = ""; tag_valid_ = false; }
  bool has_tag() const { return tag_valid_; }

  const std::string& payload() const { return payload_; }
  void set_payload(const std::string& value) { payload_ = value; payload_valid_ = true; }
  void clear_payload() { payload_ = ""; payload_valid_ = false; }
  bool has_payload() const { return payload_valid_; }

  // Equality ops compare internal ids and all data fields.
  // Use arcs::fields_equal() to compare only the data fields.
  bool operator==(const ServicesTest_Output& other) const;
  bool operator!=(const ServicesTest_Output& other) const { return !(*this == other); }

  // For STL containers.
  friend bool operator<(const ServicesTest_Output& a, const ServicesTest_Output& b) {
    int cmp = a._internal_id_.compare(b._internal_id_);
    if (cmp != 0) return cmp < 0;
    if (a.call_valid_ != b.call_valid_) {
      return !a.call_valid_;
    } else {
      cmp = a.call_.compare(b.call_);
      if (cmp != 0) return cmp < 0;
    }
    if (a.tag_valid_ != b.tag_valid_) {
      return !a.tag_valid_;
    } else {
      cmp = a.tag_.compare(b.tag_);
      if (cmp != 0) return cmp < 0;
    }
    if (a.payload_valid_ != b.payload_valid_) {
      return !a.payload_valid_;
    } else {
      cmp = a.payload_.compare(b.payload_);
      if (cmp != 0) return cmp < 0;
    };
    return false;
  }

protected:
  // Allow private copying for use in Handles.
  ServicesTest_Output(const ServicesTest_Output&) = default;
  ServicesTest_Output& operator=(const ServicesTest_Output&) = default;

  static const char* _schema_hash() { return "4fea976148a3d64d870e66279f17ed74400b3738"; }
  static const int _field_count = 3;

  std::string call_ = "";
  bool call_valid_ = false;

  std::string tag_ = "";
  bool tag_valid_ = false;

  std::string payload_ = "";
  bool payload_valid_ = false;

  std::string _internal_id_;

  friend class Singleton<ServicesTest_Output>;
  friend class Collection<ServicesTest_Output>;
  friend class Ref<ServicesTest_Output>;
  friend class internal::Accessor;
};

template<>
inline ServicesTest_Output internal::Accessor::clone_entity(const ServicesTest_Output& entity) {
  ServicesTest_Output clone;
  clone.call_ = entity.call_;
  clone.call_valid_ = entity.call_valid_;
  clone.tag_ = entity.tag_;
  clone.tag_valid_ = entity.tag_valid_;
  clone.payload_ = entity.payload_;
  clone.payload_valid_ = entity.payload_valid_;
  return clone;
}

template<>
inline size_t internal::Accessor::hash_entity(const ServicesTest_Output& entity) {
  size_t h = 0;
  internal::hash_combine(h, entity._internal_id_);
  if (entity.call_valid_)
    internal::hash_combine(h, entity.call_);
  if (entity.tag_valid_)
    internal::hash_combine(h, entity.tag_);
  if (entity.payload_valid_)
    internal::hash_combine(h, entity.payload_);
  return h;
}

template<>
inline bool internal::Accessor::fields_equal(const ServicesTest_Output& a, const ServicesTest_Output& b) {
  return (a.call_valid_ ? (b.call_valid_ && a.call_ == b.call_) : !b.call_valid_) &&
         (a.tag_valid_ ? (b.tag_valid_ && a.tag_ == b.tag_) : !b.tag_valid_) &&
         (a.payload_valid_ ? (b.payload_valid_ && a.payload_ == b.payload_) : !b.payload_valid_);
}

inline bool ServicesTest_Output::operator==(const ServicesTest_Output& other) const {
  return _internal_id_ == other._internal_id_ && fields_equal(*this, other);
}

template<>
inline std::string internal::Accessor::entity_to_str(const ServicesTest_Output& entity, const char* join) {
  internal::StringPrinter printer;
  printer.addId(entity._internal_id_);
  if (entity.call_valid_)
    printer.add("call: ", entity.call_);
  if (entity.tag_valid_)
    printer.add("tag: ", entity.tag_);
  if (entity.payload_valid_)
    printer.add("payload: ", entity.payload_);
  return printer.result(join);
}

template<>
inline void internal::Accessor::decode_entity(ServicesTest_Output* entity, const char* str) {
  if (str == nullptr) return;
  internal::StringDecoder decoder(str);
  decoder.decode(entity->_internal_id_);
  decoder.validate("|");
  for (int i = 0; !decoder.done() && i < ServicesTest_Output::_field_count; i++) {
    std::string name = decoder.upTo(':');
    if (0) {
    } else if (name == "call") {
      decoder.validate("T");
      decoder.decode(entity->call_);
      entity->call_valid_ = true;
    } else if (name == "tag") {
      decoder.validate("T");
      decoder.decode(entity->tag_);
      entity->tag_valid_ = true;
    } else if (name == "payload") {
      decoder.validate("T");
      decoder.decode(entity->payload_);
      entity->payload_valid_ = true;
    }
    decoder.validate("|");
  }
}

template<>
inline std::string internal::Accessor::encode_entity(const ServicesTest_Output& entity) {
  internal::StringEncoder encoder;
  encoder.encode("", entity._internal_id_);
  if (entity.call_valid_)
    encoder.encode("call:T", entity.call_);
  if (entity.tag_valid_)
    encoder.encode("tag:T", entity.tag_);
  if (entity.payload_valid_)
    encoder.encode("payload:T", entity.payload_);
  return encoder.result();
}

}  // namespace arcs

// For STL unordered associative containers. Entities will need to be std::move()-inserted.
template<>
struct std::hash<arcs::ServicesTest_Output> {
  size_t operator()(const arcs::ServicesTest_Output& entity) const {
    return arcs::hash_entity(entity);
  }
};

namespace arcs {

class EntityClassApiTest_Empty {
public:
  // Entities must be copied with arcs::clone_entity(), which will exclude the internal id.
  // Move operations are ok (and will include the internal id).
  EntityClassApiTest_Empty() = default;
  EntityClassApiTest_Empty(EntityClassApiTest_Empty&&) = default;
  EntityClassApiTest_Empty& operator=(EntityClassApiTest_Empty&&) = default;



  // Equality ops compare internal ids and all data fields.
  // Use arcs::fields_equal() to compare only the data fields.
  bool operator==(const EntityClassApiTest_Empty& other) const;
  bool operator!=(const EntityClassApiTest_Empty& other) const { return !(*this == other); }

  // For STL containers.
  friend bool operator<(const EntityClassApiTest_Empty& a, const EntityClassApiTest_Empty& b) {
    int cmp = a._internal_id_.compare(b._internal_id_);
    if (cmp != 0) return cmp < 0;
    ;
    return false;
  }

protected:
  // Allow private copying for use in Handles.
  EntityClassApiTest_Empty(const EntityClassApiTest_Empty&) = default;
  EntityClassApiTest_Empty& operator=(const EntityClassApiTest_Empty&) = default;

  static const char* _schema_hash() { return "42099b4af021e53fd8fd4e056c2568d7c2e3ffa8"; }
  static const int _field_count = 0;


  std::string _internal_id_;

  friend class Singleton<EntityClassApiTest_Empty>;
  friend class Collection<EntityClassApiTest_Empty>;
  friend class Ref<EntityClassApiTest_Empty>;
  friend class internal::Accessor;
};

template<>
inline EntityClassApiTest_Empty internal::Accessor::clone_entity(const EntityClassApiTest_Empty& entity) {
  EntityClassApiTest_Empty clone;

  return clone;
}

template<>
inline size_t internal::Accessor::hash_entity(const EntityClassApiTest_Empty& entity) {
  size_t h = 0;
  internal::hash_combine(h, entity._internal_id_);

  return h;
}

template<>
inline bool internal::Accessor::fields_equal(const EntityClassApiTest_Empty& a, const EntityClassApiTest_Empty& b) {
  return true;
}

inline bool EntityClassApiTest_Empty::operator==(const EntityClassApiTest_Empty& other) const {
  return _internal_id_ == other._internal_id_ && fields_equal(*this, other);
}

template<>
inline std::string internal::Accessor::entity_to_str(const EntityClassApiTest_Empty& entity, const char* join) {
  internal::StringPrinter printer;
  printer.addId(entity._internal_id_);

  return printer.result(join);
}

template<>
inline void internal::Accessor::decode_entity(EntityClassApiTest_Empty* entity, const char* str) {
  if (str == nullptr) return;
  internal::StringDecoder decoder(str);
  decoder.decode(entity->_internal_id_);
  decoder.validate("|");
  for (int i = 0; !decoder.done() && i < EntityClassApiTest_Empty::_field_count; i++) {
    std::string name = decoder.upTo(':');
    if (0) {

    }
    decoder.validate("|");
  }
}

template<>
inline std::string internal::Accessor::encode_entity(const EntityClassApiTest_Empty& entity) {
  internal::StringEncoder encoder;
  encoder.encode("", entity._internal_id_);

  return encoder.result();
}

}  // namespace arcs

// For STL unordered associative containers. Entities will need to be std::move()-inserted.
template<>
struct std::hash<arcs::EntityClassApiTest_Empty> {
  size_t operator()(const arcs::EntityClassApiTest_Empty& entity) const {
    return arcs::hash_entity(entity);
  }
};

namespace arcs {

class EntityClassApiTest_Data_Ref {
public:
  // Entities must be copied with arcs::clone_entity(), which will exclude the internal id.
  // Move operations are ok (and will include the internal id).
  EntityClassApiTest_Data_Ref() = default;
  EntityClassApiTest_Data_Ref(EntityClassApiTest_Data_Ref&&) = default;
  EntityClassApiTest_Data_Ref& operator=(EntityClassApiTest_Data_Ref&&) = default;

  template<typename T>
  EntityClassApiTest_Data_Ref(const T& other) :
    val_(other.val()), val_valid_(other.has_val())
  {}

  const std::string& val() const { return val_; }
  void set_val(const std::string& value) { val_ = value; val_valid_ = true; }
  void clear_val() { val_ = ""; val_valid_ = false; }
  bool has_val() const { return val_valid_; }

  // Equality ops compare internal ids and all data fields.
  // Use arcs::fields_equal() to compare only the data fields.
  bool operator==(const EntityClassApiTest_Data_Ref& other) const;
  bool operator!=(const EntityClassApiTest_Data_Ref& other) const { return !(*this == other); }

  // For STL containers.
  friend bool operator<(const EntityClassApiTest_Data_Ref& a, const EntityClassApiTest_Data_Ref& b) {
    int cmp = a._internal_id_.compare(b._internal_id_);
    if (cmp != 0) return cmp < 0;
    if (a.val_valid_ != b.val_valid_) {
      return !a.val_valid_;
    } else {
      cmp = a.val_.compare(b.val_);
      if (cmp != 0) return cmp < 0;
    };
    return false;
  }

protected:
  // Allow private copying for use in Handles.
  EntityClassApiTest_Data_Ref(const EntityClassApiTest_Data_Ref&) = default;
  EntityClassApiTest_Data_Ref& operator=(const EntityClassApiTest_Data_Ref&) = default;

  static const char* _schema_hash() { return "a98c1c524edca305a86475ecf09e531a8be458df"; }
  static const int _field_count = 1;

  std::string val_ = "";
  bool val_valid_ = false;

  std::string _internal_id_;

  friend class Singleton<EntityClassApiTest_Data_Ref>;
  friend class Collection<EntityClassApiTest_Data_Ref>;
  friend class Ref<EntityClassApiTest_Data_Ref>;
  friend class internal::Accessor;
};

template<>
inline EntityClassApiTest_Data_Ref internal::Accessor::clone_entity(const EntityClassApiTest_Data_Ref& entity) {
  EntityClassApiTest_Data_Ref clone;
  clone.val_ = entity.val_;
  clone.val_valid_ = entity.val_valid_;
  return clone;
}

template<>
inline size_t internal::Accessor::hash_entity(const EntityClassApiTest_Data_Ref& entity) {
  size_t h = 0;
  internal::hash_combine(h, entity._internal_id_);
  if (entity.val_valid_)
    internal::hash_combine(h, entity.val_);
  return h;
}

template<>
inline bool internal::Accessor::fields_equal(const EntityClassApiTest_Data_Ref& a, const EntityClassApiTest_Data_Ref& b) {
  return (a.val_valid_ ? (b.val_valid_ && a.val_ == b.val_) : !b.val_valid_);
}

inline bool EntityClassApiTest_Data_Ref::operator==(const EntityClassApiTest_Data_Ref& other) const {
  return _internal_id_ == other._internal_id_ && fields_equal(*this, other);
}

template<>
inline std::string internal::Accessor::entity_to_str(const EntityClassApiTest_Data_Ref& entity, const char* join) {
  internal::StringPrinter printer;
  printer.addId(entity._internal_id_);
  if (entity.val_valid_)
    printer.add("val: ", entity.val_);
  return printer.result(join);
}

template<>
inline void internal::Accessor::decode_entity(EntityClassApiTest_Data_Ref* entity, const char* str) {
  if (str == nullptr) return;
  internal::StringDecoder decoder(str);
  decoder.decode(entity->_internal_id_);
  decoder.validate("|");
  for (int i = 0; !decoder.done() && i < EntityClassApiTest_Data_Ref::_field_count; i++) {
    std::string name = decoder.upTo(':');
    if (0) {
    } else if (name == "val") {
      decoder.validate("T");
      decoder.decode(entity->val_);
      entity->val_valid_ = true;
    }
    decoder.validate("|");
  }
}

template<>
inline std::string internal::Accessor::encode_entity(const EntityClassApiTest_Data_Ref& entity) {
  internal::StringEncoder encoder;
  encoder.encode("", entity._internal_id_);
  if (entity.val_valid_)
    encoder.encode("val:T", entity.val_);
  return encoder.result();
}

}  // namespace arcs

// For STL unordered associative containers. Entities will need to be std::move()-inserted.
template<>
struct std::hash<arcs::EntityClassApiTest_Data_Ref> {
  size_t operator()(const arcs::EntityClassApiTest_Data_Ref& entity) const {
    return arcs::hash_entity(entity);
  }
};

namespace arcs {

class EntityClassApiTest_Errors {
public:
  // Entities must be copied with arcs::clone_entity(), which will exclude the internal id.
  // Move operations are ok (and will include the internal id).
  EntityClassApiTest_Errors() = default;
  EntityClassApiTest_Errors(EntityClassApiTest_Errors&&) = default;
  EntityClassApiTest_Errors& operator=(EntityClassApiTest_Errors&&) = default;

  template<typename T>
  EntityClassApiTest_Errors(const T& other) :
    msg_(other.msg()), msg_valid_(other.has_msg())
  {}

  const std::string& msg() const { return msg_; }
  void set_msg(const std::string& value) { msg_ = value; msg_valid_ = true; }
  void clear_msg() { msg_ = ""; msg_valid_ = false; }
  bool has_msg() const { return msg_valid_; }

  // Equality ops compare internal ids and all data fields.
  // Use arcs::fields_equal() to compare only the data fields.
  bool operator==(const EntityClassApiTest_Errors& other) const;
  bool operator!=(const EntityClassApiTest_Errors& other) const { return !(*this == other); }

  // For STL containers.
  friend bool operator<(const EntityClassApiTest_Errors& a, const EntityClassApiTest_Errors& b) {
    int cmp = a._internal_id_.compare(b._internal_id_);
    if (cmp != 0) return cmp < 0;
    if (a.msg_valid_ != b.msg_valid_) {
      return !a.msg_valid_;
    } else {
      cmp = a.msg_.compare(b.msg_);
      if (cmp != 0) return cmp < 0;
    };
    return false;
  }

protected:
  // Allow private copying for use in Handles.
  EntityClassApiTest_Errors(const EntityClassApiTest_Errors&) = default;
  EntityClassApiTest_Errors& operator=(const EntityClassApiTest_Errors&) = default;

  static const char* _schema_hash() { return "a0585fca550b0e22524d5f7355084f110e4300c1"; }
  static const int _field_count = 1;

  std::string msg_ = "";
  bool msg_valid_ = false;

  std::string _internal_id_;

  friend class Singleton<EntityClassApiTest_Errors>;
  friend class Collection<EntityClassApiTest_Errors>;
  friend class Ref<EntityClassApiTest_Errors>;
  friend class internal::Accessor;
};

template<>
inline EntityClassApiTest_Errors internal::Accessor::clone_entity(const EntityClassApiTest_Errors& entity) {
  EntityClassApiTest_Errors clone;
  clone.msg_ = entity.msg_;
  clone.msg_valid_ = entity.msg_valid_;
  return clone;
}

template<>
inline size_t internal::Accessor::hash_entity(const EntityClassApiTest_Errors& entity) {
  size_t h = 0;
  internal::hash_combine(h, entity._internal_id_);
  if (entity.msg_valid_)
    internal::hash_combine(h, entity.msg_);
  return h;
}

template<>
inline bool internal::Accessor::fields_equal(const EntityClassApiTest_Errors& a, const EntityClassApiTest_Errors& b) {
  return (a.msg_valid_ ? (b.msg_valid_ && a.msg_ == b.msg_) : !b.msg_valid_);
}

inline bool EntityClassApiTest_Errors::operator==(const EntityClassApiTest_Errors& other) const {
  return _internal_id_ == other._internal_id_ && fields_equal(*this, other);
}

template<>
inline std::string internal::Accessor::entity_to_str(const EntityClassApiTest_Errors& entity, const char* join) {
  internal::StringPrinter printer;
  printer.addId(entity._internal_id_);
  if (entity.msg_valid_)
    printer.add("msg: ", entity.msg_);
  return printer.result(join);
}

template<>
inline void internal::Accessor::decode_entity(EntityClassApiTest_Errors* entity, const char* str) {
  if (str == nullptr) return;
  internal::StringDecoder decoder(str);
  decoder.decode(entity->_internal_id_);
  decoder.validate("|");
  for (int i = 0; !decoder.done() && i < EntityClassApiTest_Errors::_field_count; i++) {
    std::string name = decoder.upTo(':');
    if (0) {
    } else if (name == "msg") {
      decoder.validate("T");
      decoder.decode(entity->msg_);
      entity->msg_valid_ = true;
    }
    decoder.validate("|");
  }
}

template<>
inline std::string internal::Accessor::encode_entity(const EntityClassApiTest_Errors& entity) {
  internal::StringEncoder encoder;
  encoder.encode("", entity._internal_id_);
  if (entity.msg_valid_)
    encoder.encode("msg:T", entity.msg_);
  return encoder.result();
}

}  // namespace arcs

// For STL unordered associative containers. Entities will need to be std::move()-inserted.
template<>
struct std::hash<arcs::EntityClassApiTest_Errors> {
  size_t operator()(const arcs::EntityClassApiTest_Errors& entity) const {
    return arcs::hash_entity(entity);
  }
};

namespace arcs {

class EntityClassApiTest_Data {
public:
  // Entities must be copied with arcs::clone_entity(), which will exclude the internal id.
  // Move operations are ok (and will include the internal id).
  EntityClassApiTest_Data() = default;
  EntityClassApiTest_Data(EntityClassApiTest_Data&&) = default;
  EntityClassApiTest_Data& operator=(EntityClassApiTest_Data&&) = default;

  template<typename T>
  EntityClassApiTest_Data(const T& other) :
    num_(other.num()), num_valid_(other.has_num()),
    txt_(other.txt()), txt_valid_(other.has_txt()),
    lnk_(other.lnk()), lnk_valid_(other.has_lnk()),
    flg_(other.flg()), flg_valid_(other.has_flg()),
    ref_(other.ref())
  {}

  double num() const { return num_; }
  void set_num(double value) { num_ = value; num_valid_ = true; }
  void clear_num() { num_ = 0; num_valid_ = false; }
  bool has_num() const { return num_valid_; }

  const std::string& txt() const { return txt_; }
  void set_txt(const std::string& value) { txt_ = value; txt_valid_ = true; }
  void clear_txt() { txt_ = ""; txt_valid_ = false; }
  bool has_txt() const { return txt_valid_; }

  const URL& lnk() const { return lnk_; }
  void set_lnk(const URL& value) { lnk_ = value; lnk_valid_ = true; }
  void clear_lnk() { lnk_ = ""; lnk_valid_ = false; }
  bool has_lnk() const { return lnk_valid_; }

  bool flg() const { return flg_; }
  void set_flg(bool value) { flg_ = value; flg_valid_ = true; }
  void clear_flg() { flg_ = false; flg_valid_ = false; }
  bool has_flg() const { return flg_valid_; }

  const Ref<EntityClassApiTest_Data_Ref>& ref() const { return ref_; }
  void bind_ref(const EntityClassApiTest_Data_Ref& value) { internal::Accessor::bind(&ref_, value); }

  // Equality ops compare internal ids and all data fields.
  // Use arcs::fields_equal() to compare only the data fields.
  bool operator==(const EntityClassApiTest_Data& other) const;
  bool operator!=(const EntityClassApiTest_Data& other) const { return !(*this == other); }

  // For STL containers.
  friend bool operator<(const EntityClassApiTest_Data& a, const EntityClassApiTest_Data& b) {
    int cmp = a._internal_id_.compare(b._internal_id_);
    if (cmp != 0) return cmp < 0;
    if (a.num_valid_ != b.num_valid_) {
      return !a.num_valid_;
    } else if (a.num_ != b.num_) {
      return a.num_ < b.num_;
    }
    if (a.txt_valid_ != b.txt_valid_) {
      return !a.txt_valid_;
    } else {
      cmp = a.txt_.compare(b.txt_);
      if (cmp != 0) return cmp < 0;
    }
    if (a.lnk_valid_ != b.lnk_valid_) {
      return !a.lnk_valid_;
    } else {
      cmp = a.lnk_.compare(b.lnk_);
      if (cmp != 0) return cmp < 0;
    }
    if (a.flg_valid_ != b.flg_valid_) {
      return !a.flg_valid_;
    } else if (a.flg_ != b.flg_) {
      return a.flg_ < b.flg_;
    }
    if (a.ref_ != b.ref_) {
      return a.ref_ < b.ref_;
    };
    return false;
  }

protected:
  // Allow private copying for use in Handles.
  EntityClassApiTest_Data(const EntityClassApiTest_Data&) = default;
  EntityClassApiTest_Data& operator=(const EntityClassApiTest_Data&) = default;

  static const char* _schema_hash() { return "7ce9e3f97cae5dc6b9570724bbdd33fd8b1ef930"; }
  static const int _field_count = 5;

  double num_ = 0;
  bool num_valid_ = false;

  std::string txt_ = "";
  bool txt_valid_ = false;

  URL lnk_ = "";
  bool lnk_valid_ = false;

  bool flg_ = false;
  bool flg_valid_ = false;

  Ref<EntityClassApiTest_Data_Ref> ref_;

  std::string _internal_id_;

  friend class Singleton<EntityClassApiTest_Data>;
  friend class Collection<EntityClassApiTest_Data>;
  friend class Ref<EntityClassApiTest_Data>;
  friend class internal::Accessor;
};

template<>
inline EntityClassApiTest_Data internal::Accessor::clone_entity(const EntityClassApiTest_Data& entity) {
  EntityClassApiTest_Data clone;
  clone.num_ = entity.num_;
  clone.num_valid_ = entity.num_valid_;
  clone.txt_ = entity.txt_;
  clone.txt_valid_ = entity.txt_valid_;
  clone.lnk_ = entity.lnk_;
  clone.lnk_valid_ = entity.lnk_valid_;
  clone.flg_ = entity.flg_;
  clone.flg_valid_ = entity.flg_valid_;
  clone.ref_ = entity.ref_;
  return clone;
}

template<>
inline size_t internal::Accessor::hash_entity(const EntityClassApiTest_Data& entity) {
  size_t h = 0;
  internal::hash_combine(h, entity._internal_id_);
  if (entity.num_valid_)
    internal::hash_combine(h, entity.num_);
  if (entity.txt_valid_)
    internal::hash_combine(h, entity.txt_);
  if (entity.lnk_valid_)
    internal::hash_combine(h, entity.lnk_);
  if (entity.flg_valid_)
    internal::hash_combine(h, entity.flg_);
  if (entity.ref_._internal_id_ != "")
    internal::hash_combine(h, entity.ref_);
  return h;
}

template<>
inline bool internal::Accessor::fields_equal(const EntityClassApiTest_Data& a, const EntityClassApiTest_Data& b) {
  return (a.num_valid_ ? (b.num_valid_ && a.num_ == b.num_) : !b.num_valid_) &&
         (a.txt_valid_ ? (b.txt_valid_ && a.txt_ == b.txt_) : !b.txt_valid_) &&
         (a.lnk_valid_ ? (b.lnk_valid_ && a.lnk_ == b.lnk_) : !b.lnk_valid_) &&
         (a.flg_valid_ ? (b.flg_valid_ && a.flg_ == b.flg_) : !b.flg_valid_) &&
         (a.ref_ == b.ref_);
}

inline bool EntityClassApiTest_Data::operator==(const EntityClassApiTest_Data& other) const {
  return _internal_id_ == other._internal_id_ && fields_equal(*this, other);
}

template<>
inline std::string internal::Accessor::entity_to_str(const EntityClassApiTest_Data& entity, const char* join) {
  internal::StringPrinter printer;
  printer.addId(entity._internal_id_);
  if (entity.num_valid_)
    printer.add("num: ", entity.num_);
  if (entity.txt_valid_)
    printer.add("txt: ", entity.txt_);
  if (entity.lnk_valid_)
    printer.add("lnk: ", entity.lnk_);
  if (entity.flg_valid_)
    printer.add("flg: ", entity.flg_);
  if (entity.ref_._internal_id_ != "")
    printer.add("ref: ", entity.ref_);
  return printer.result(join);
}

template<>
inline void internal::Accessor::decode_entity(EntityClassApiTest_Data* entity, const char* str) {
  if (str == nullptr) return;
  internal::StringDecoder decoder(str);
  decoder.decode(entity->_internal_id_);
  decoder.validate("|");
  for (int i = 0; !decoder.done() && i < EntityClassApiTest_Data::_field_count; i++) {
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
    } else if (name == "ref") {
      decoder.validate("R");
      decoder.decode(entity->ref_);
    }
    decoder.validate("|");
  }
}

template<>
inline std::string internal::Accessor::encode_entity(const EntityClassApiTest_Data& entity) {
  internal::StringEncoder encoder;
  encoder.encode("", entity._internal_id_);
  if (entity.num_valid_)
    encoder.encode("num:N", entity.num_);
  if (entity.txt_valid_)
    encoder.encode("txt:T", entity.txt_);
  if (entity.lnk_valid_)
    encoder.encode("lnk:U", entity.lnk_);
  if (entity.flg_valid_)
    encoder.encode("flg:B", entity.flg_);
  if (entity.ref_._internal_id_ != "")
    encoder.encode("ref:R", entity.ref_);
  return encoder.result();
}

}  // namespace arcs

// For STL unordered associative containers. Entities will need to be std::move()-inserted.
template<>
struct std::hash<arcs::EntityClassApiTest_Data> {
  size_t operator()(const arcs::EntityClassApiTest_Data& entity) const {
    return arcs::hash_entity(entity);
  }
};

namespace arcs {

class SpecialSchemaFieldsTest_Fields {
public:
  // Entities must be copied with arcs::clone_entity(), which will exclude the internal id.
  // Move operations are ok (and will include the internal id).
  SpecialSchemaFieldsTest_Fields() = default;
  SpecialSchemaFieldsTest_Fields(SpecialSchemaFieldsTest_Fields&&) = default;
  SpecialSchemaFieldsTest_Fields& operator=(SpecialSchemaFieldsTest_Fields&&) = default;

  template<typename T>
  SpecialSchemaFieldsTest_Fields(const T& other) :
    for_(other._for()), for_valid_(other.has_for()),
    internal_id_(other.internal_id()), internal_id_valid_(other.has_internal_id()),
    internalId_(other.internalId()), internalId_valid_(other.has_internalId())
  {}

  const std::string& _for() const { return for_; }
  void set_for(const std::string& value) { for_ = value; for_valid_ = true; }
  void clear_for() { for_ = ""; for_valid_ = false; }
  bool has_for() const { return for_valid_; }

  double internal_id() const { return internal_id_; }
  void set_internal_id(double value) { internal_id_ = value; internal_id_valid_ = true; }
  void clear_internal_id() { internal_id_ = 0; internal_id_valid_ = false; }
  bool has_internal_id() const { return internal_id_valid_; }

  double internalId() const { return internalId_; }
  void set_internalId(double value) { internalId_ = value; internalId_valid_ = true; }
  void clear_internalId() { internalId_ = 0; internalId_valid_ = false; }
  bool has_internalId() const { return internalId_valid_; }

  // Equality ops compare internal ids and all data fields.
  // Use arcs::fields_equal() to compare only the data fields.
  bool operator==(const SpecialSchemaFieldsTest_Fields& other) const;
  bool operator!=(const SpecialSchemaFieldsTest_Fields& other) const { return !(*this == other); }

  // For STL containers.
  friend bool operator<(const SpecialSchemaFieldsTest_Fields& a, const SpecialSchemaFieldsTest_Fields& b) {
    int cmp = a._internal_id_.compare(b._internal_id_);
    if (cmp != 0) return cmp < 0;
    if (a.for_valid_ != b.for_valid_) {
      return !a.for_valid_;
    } else {
      cmp = a.for_.compare(b.for_);
      if (cmp != 0) return cmp < 0;
    }
    if (a.internal_id_valid_ != b.internal_id_valid_) {
      return !a.internal_id_valid_;
    } else if (a.internal_id_ != b.internal_id_) {
      return a.internal_id_ < b.internal_id_;
    }
    if (a.internalId_valid_ != b.internalId_valid_) {
      return !a.internalId_valid_;
    } else if (a.internalId_ != b.internalId_) {
      return a.internalId_ < b.internalId_;
    };
    return false;
  }

protected:
  // Allow private copying for use in Handles.
  SpecialSchemaFieldsTest_Fields(const SpecialSchemaFieldsTest_Fields&) = default;
  SpecialSchemaFieldsTest_Fields& operator=(const SpecialSchemaFieldsTest_Fields&) = default;

  static const char* _schema_hash() { return "3c7cb18c9dcded06edb78cb8052847b2ce53322c"; }
  static const int _field_count = 3;

  std::string for_ = "";
  bool for_valid_ = false;

  double internal_id_ = 0;
  bool internal_id_valid_ = false;

  double internalId_ = 0;
  bool internalId_valid_ = false;

  std::string _internal_id_;

  friend class Singleton<SpecialSchemaFieldsTest_Fields>;
  friend class Collection<SpecialSchemaFieldsTest_Fields>;
  friend class Ref<SpecialSchemaFieldsTest_Fields>;
  friend class internal::Accessor;
};

template<>
inline SpecialSchemaFieldsTest_Fields internal::Accessor::clone_entity(const SpecialSchemaFieldsTest_Fields& entity) {
  SpecialSchemaFieldsTest_Fields clone;
  clone.for_ = entity.for_;
  clone.for_valid_ = entity.for_valid_;
  clone.internal_id_ = entity.internal_id_;
  clone.internal_id_valid_ = entity.internal_id_valid_;
  clone.internalId_ = entity.internalId_;
  clone.internalId_valid_ = entity.internalId_valid_;
  return clone;
}

template<>
inline size_t internal::Accessor::hash_entity(const SpecialSchemaFieldsTest_Fields& entity) {
  size_t h = 0;
  internal::hash_combine(h, entity._internal_id_);
  if (entity.for_valid_)
    internal::hash_combine(h, entity.for_);
  if (entity.internal_id_valid_)
    internal::hash_combine(h, entity.internal_id_);
  if (entity.internalId_valid_)
    internal::hash_combine(h, entity.internalId_);
  return h;
}

template<>
inline bool internal::Accessor::fields_equal(const SpecialSchemaFieldsTest_Fields& a, const SpecialSchemaFieldsTest_Fields& b) {
  return (a.for_valid_ ? (b.for_valid_ && a.for_ == b.for_) : !b.for_valid_) &&
         (a.internal_id_valid_ ? (b.internal_id_valid_ && a.internal_id_ == b.internal_id_) : !b.internal_id_valid_) &&
         (a.internalId_valid_ ? (b.internalId_valid_ && a.internalId_ == b.internalId_) : !b.internalId_valid_);
}

inline bool SpecialSchemaFieldsTest_Fields::operator==(const SpecialSchemaFieldsTest_Fields& other) const {
  return _internal_id_ == other._internal_id_ && fields_equal(*this, other);
}

template<>
inline std::string internal::Accessor::entity_to_str(const SpecialSchemaFieldsTest_Fields& entity, const char* join) {
  internal::StringPrinter printer;
  printer.addId(entity._internal_id_);
  if (entity.for_valid_)
    printer.add("for: ", entity.for_);
  if (entity.internal_id_valid_)
    printer.add("internal_id: ", entity.internal_id_);
  if (entity.internalId_valid_)
    printer.add("internalId: ", entity.internalId_);
  return printer.result(join);
}

template<>
inline void internal::Accessor::decode_entity(SpecialSchemaFieldsTest_Fields* entity, const char* str) {
  if (str == nullptr) return;
  internal::StringDecoder decoder(str);
  decoder.decode(entity->_internal_id_);
  decoder.validate("|");
  for (int i = 0; !decoder.done() && i < SpecialSchemaFieldsTest_Fields::_field_count; i++) {
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
    } else if (name == "internalId") {
      decoder.validate("N");
      decoder.decode(entity->internalId_);
      entity->internalId_valid_ = true;
    }
    decoder.validate("|");
  }
}

template<>
inline std::string internal::Accessor::encode_entity(const SpecialSchemaFieldsTest_Fields& entity) {
  internal::StringEncoder encoder;
  encoder.encode("", entity._internal_id_);
  if (entity.for_valid_)
    encoder.encode("for:T", entity.for_);
  if (entity.internal_id_valid_)
    encoder.encode("internal_id:N", entity.internal_id_);
  if (entity.internalId_valid_)
    encoder.encode("internalId:N", entity.internalId_);
  return encoder.result();
}

}  // namespace arcs

// For STL unordered associative containers. Entities will need to be std::move()-inserted.
template<>
struct std::hash<arcs::SpecialSchemaFieldsTest_Fields> {
  size_t operator()(const arcs::SpecialSchemaFieldsTest_Fields& entity) const {
    return arcs::hash_entity(entity);
  }
};

namespace arcs {

class SpecialSchemaFieldsTest_Errors {
public:
  // Entities must be copied with arcs::clone_entity(), which will exclude the internal id.
  // Move operations are ok (and will include the internal id).
  SpecialSchemaFieldsTest_Errors() = default;
  SpecialSchemaFieldsTest_Errors(SpecialSchemaFieldsTest_Errors&&) = default;
  SpecialSchemaFieldsTest_Errors& operator=(SpecialSchemaFieldsTest_Errors&&) = default;

  template<typename T>
  SpecialSchemaFieldsTest_Errors(const T& other) :
    msg_(other.msg()), msg_valid_(other.has_msg())
  {}

  const std::string& msg() const { return msg_; }
  void set_msg(const std::string& value) { msg_ = value; msg_valid_ = true; }
  void clear_msg() { msg_ = ""; msg_valid_ = false; }
  bool has_msg() const { return msg_valid_; }

  // Equality ops compare internal ids and all data fields.
  // Use arcs::fields_equal() to compare only the data fields.
  bool operator==(const SpecialSchemaFieldsTest_Errors& other) const;
  bool operator!=(const SpecialSchemaFieldsTest_Errors& other) const { return !(*this == other); }

  // For STL containers.
  friend bool operator<(const SpecialSchemaFieldsTest_Errors& a, const SpecialSchemaFieldsTest_Errors& b) {
    int cmp = a._internal_id_.compare(b._internal_id_);
    if (cmp != 0) return cmp < 0;
    if (a.msg_valid_ != b.msg_valid_) {
      return !a.msg_valid_;
    } else {
      cmp = a.msg_.compare(b.msg_);
      if (cmp != 0) return cmp < 0;
    };
    return false;
  }

protected:
  // Allow private copying for use in Handles.
  SpecialSchemaFieldsTest_Errors(const SpecialSchemaFieldsTest_Errors&) = default;
  SpecialSchemaFieldsTest_Errors& operator=(const SpecialSchemaFieldsTest_Errors&) = default;

  static const char* _schema_hash() { return "a0585fca550b0e22524d5f7355084f110e4300c1"; }
  static const int _field_count = 1;

  std::string msg_ = "";
  bool msg_valid_ = false;

  std::string _internal_id_;

  friend class Singleton<SpecialSchemaFieldsTest_Errors>;
  friend class Collection<SpecialSchemaFieldsTest_Errors>;
  friend class Ref<SpecialSchemaFieldsTest_Errors>;
  friend class internal::Accessor;
};

template<>
inline SpecialSchemaFieldsTest_Errors internal::Accessor::clone_entity(const SpecialSchemaFieldsTest_Errors& entity) {
  SpecialSchemaFieldsTest_Errors clone;
  clone.msg_ = entity.msg_;
  clone.msg_valid_ = entity.msg_valid_;
  return clone;
}

template<>
inline size_t internal::Accessor::hash_entity(const SpecialSchemaFieldsTest_Errors& entity) {
  size_t h = 0;
  internal::hash_combine(h, entity._internal_id_);
  if (entity.msg_valid_)
    internal::hash_combine(h, entity.msg_);
  return h;
}

template<>
inline bool internal::Accessor::fields_equal(const SpecialSchemaFieldsTest_Errors& a, const SpecialSchemaFieldsTest_Errors& b) {
  return (a.msg_valid_ ? (b.msg_valid_ && a.msg_ == b.msg_) : !b.msg_valid_);
}

inline bool SpecialSchemaFieldsTest_Errors::operator==(const SpecialSchemaFieldsTest_Errors& other) const {
  return _internal_id_ == other._internal_id_ && fields_equal(*this, other);
}

template<>
inline std::string internal::Accessor::entity_to_str(const SpecialSchemaFieldsTest_Errors& entity, const char* join) {
  internal::StringPrinter printer;
  printer.addId(entity._internal_id_);
  if (entity.msg_valid_)
    printer.add("msg: ", entity.msg_);
  return printer.result(join);
}

template<>
inline void internal::Accessor::decode_entity(SpecialSchemaFieldsTest_Errors* entity, const char* str) {
  if (str == nullptr) return;
  internal::StringDecoder decoder(str);
  decoder.decode(entity->_internal_id_);
  decoder.validate("|");
  for (int i = 0; !decoder.done() && i < SpecialSchemaFieldsTest_Errors::_field_count; i++) {
    std::string name = decoder.upTo(':');
    if (0) {
    } else if (name == "msg") {
      decoder.validate("T");
      decoder.decode(entity->msg_);
      entity->msg_valid_ = true;
    }
    decoder.validate("|");
  }
}

template<>
inline std::string internal::Accessor::encode_entity(const SpecialSchemaFieldsTest_Errors& entity) {
  internal::StringEncoder encoder;
  encoder.encode("", entity._internal_id_);
  if (entity.msg_valid_)
    encoder.encode("msg:T", entity.msg_);
  return encoder.result();
}

}  // namespace arcs

// For STL unordered associative containers. Entities will need to be std::move()-inserted.
template<>
struct std::hash<arcs::SpecialSchemaFieldsTest_Errors> {
  size_t operator()(const arcs::SpecialSchemaFieldsTest_Errors& entity) const {
    return arcs::hash_entity(entity);
  }
};

namespace arcs {

class ReferenceClassApiTest_Data {
public:
  // Entities must be copied with arcs::clone_entity(), which will exclude the internal id.
  // Move operations are ok (and will include the internal id).
  ReferenceClassApiTest_Data() = default;
  ReferenceClassApiTest_Data(ReferenceClassApiTest_Data&&) = default;
  ReferenceClassApiTest_Data& operator=(ReferenceClassApiTest_Data&&) = default;

  template<typename T>
  ReferenceClassApiTest_Data(const T& other) :
    num_(other.num()), num_valid_(other.has_num()),
    txt_(other.txt()), txt_valid_(other.has_txt())
  {}

  double num() const { return num_; }
  void set_num(double value) { num_ = value; num_valid_ = true; }
  void clear_num() { num_ = 0; num_valid_ = false; }
  bool has_num() const { return num_valid_; }

  const std::string& txt() const { return txt_; }
  void set_txt(const std::string& value) { txt_ = value; txt_valid_ = true; }
  void clear_txt() { txt_ = ""; txt_valid_ = false; }
  bool has_txt() const { return txt_valid_; }

  // Equality ops compare internal ids and all data fields.
  // Use arcs::fields_equal() to compare only the data fields.
  bool operator==(const ReferenceClassApiTest_Data& other) const;
  bool operator!=(const ReferenceClassApiTest_Data& other) const { return !(*this == other); }

  // For STL containers.
  friend bool operator<(const ReferenceClassApiTest_Data& a, const ReferenceClassApiTest_Data& b) {
    int cmp = a._internal_id_.compare(b._internal_id_);
    if (cmp != 0) return cmp < 0;
    if (a.num_valid_ != b.num_valid_) {
      return !a.num_valid_;
    } else if (a.num_ != b.num_) {
      return a.num_ < b.num_;
    }
    if (a.txt_valid_ != b.txt_valid_) {
      return !a.txt_valid_;
    } else {
      cmp = a.txt_.compare(b.txt_);
      if (cmp != 0) return cmp < 0;
    };
    return false;
  }

protected:
  // Allow private copying for use in Handles.
  ReferenceClassApiTest_Data(const ReferenceClassApiTest_Data&) = default;
  ReferenceClassApiTest_Data& operator=(const ReferenceClassApiTest_Data&) = default;

  static const char* _schema_hash() { return "b3f278f670fd972c8bac1e3b862505430da66810"; }
  static const int _field_count = 2;

  double num_ = 0;
  bool num_valid_ = false;

  std::string txt_ = "";
  bool txt_valid_ = false;

  std::string _internal_id_;

  friend class Singleton<ReferenceClassApiTest_Data>;
  friend class Collection<ReferenceClassApiTest_Data>;
  friend class Ref<ReferenceClassApiTest_Data>;
  friend class internal::Accessor;
};

template<>
inline ReferenceClassApiTest_Data internal::Accessor::clone_entity(const ReferenceClassApiTest_Data& entity) {
  ReferenceClassApiTest_Data clone;
  clone.num_ = entity.num_;
  clone.num_valid_ = entity.num_valid_;
  clone.txt_ = entity.txt_;
  clone.txt_valid_ = entity.txt_valid_;
  return clone;
}

template<>
inline size_t internal::Accessor::hash_entity(const ReferenceClassApiTest_Data& entity) {
  size_t h = 0;
  internal::hash_combine(h, entity._internal_id_);
  if (entity.num_valid_)
    internal::hash_combine(h, entity.num_);
  if (entity.txt_valid_)
    internal::hash_combine(h, entity.txt_);
  return h;
}

template<>
inline bool internal::Accessor::fields_equal(const ReferenceClassApiTest_Data& a, const ReferenceClassApiTest_Data& b) {
  return (a.num_valid_ ? (b.num_valid_ && a.num_ == b.num_) : !b.num_valid_) &&
         (a.txt_valid_ ? (b.txt_valid_ && a.txt_ == b.txt_) : !b.txt_valid_);
}

inline bool ReferenceClassApiTest_Data::operator==(const ReferenceClassApiTest_Data& other) const {
  return _internal_id_ == other._internal_id_ && fields_equal(*this, other);
}

template<>
inline std::string internal::Accessor::entity_to_str(const ReferenceClassApiTest_Data& entity, const char* join) {
  internal::StringPrinter printer;
  printer.addId(entity._internal_id_);
  if (entity.num_valid_)
    printer.add("num: ", entity.num_);
  if (entity.txt_valid_)
    printer.add("txt: ", entity.txt_);
  return printer.result(join);
}

template<>
inline void internal::Accessor::decode_entity(ReferenceClassApiTest_Data* entity, const char* str) {
  if (str == nullptr) return;
  internal::StringDecoder decoder(str);
  decoder.decode(entity->_internal_id_);
  decoder.validate("|");
  for (int i = 0; !decoder.done() && i < ReferenceClassApiTest_Data::_field_count; i++) {
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
    }
    decoder.validate("|");
  }
}

template<>
inline std::string internal::Accessor::encode_entity(const ReferenceClassApiTest_Data& entity) {
  internal::StringEncoder encoder;
  encoder.encode("", entity._internal_id_);
  if (entity.num_valid_)
    encoder.encode("num:N", entity.num_);
  if (entity.txt_valid_)
    encoder.encode("txt:T", entity.txt_);
  return encoder.result();
}

}  // namespace arcs

// For STL unordered associative containers. Entities will need to be std::move()-inserted.
template<>
struct std::hash<arcs::ReferenceClassApiTest_Data> {
  size_t operator()(const arcs::ReferenceClassApiTest_Data& entity) const {
    return arcs::hash_entity(entity);
  }
};

namespace arcs {

class ReferenceClassApiTest_Errors {
public:
  // Entities must be copied with arcs::clone_entity(), which will exclude the internal id.
  // Move operations are ok (and will include the internal id).
  ReferenceClassApiTest_Errors() = default;
  ReferenceClassApiTest_Errors(ReferenceClassApiTest_Errors&&) = default;
  ReferenceClassApiTest_Errors& operator=(ReferenceClassApiTest_Errors&&) = default;

  template<typename T>
  ReferenceClassApiTest_Errors(const T& other) :
    msg_(other.msg()), msg_valid_(other.has_msg())
  {}

  const std::string& msg() const { return msg_; }
  void set_msg(const std::string& value) { msg_ = value; msg_valid_ = true; }
  void clear_msg() { msg_ = ""; msg_valid_ = false; }
  bool has_msg() const { return msg_valid_; }

  // Equality ops compare internal ids and all data fields.
  // Use arcs::fields_equal() to compare only the data fields.
  bool operator==(const ReferenceClassApiTest_Errors& other) const;
  bool operator!=(const ReferenceClassApiTest_Errors& other) const { return !(*this == other); }

  // For STL containers.
  friend bool operator<(const ReferenceClassApiTest_Errors& a, const ReferenceClassApiTest_Errors& b) {
    int cmp = a._internal_id_.compare(b._internal_id_);
    if (cmp != 0) return cmp < 0;
    if (a.msg_valid_ != b.msg_valid_) {
      return !a.msg_valid_;
    } else {
      cmp = a.msg_.compare(b.msg_);
      if (cmp != 0) return cmp < 0;
    };
    return false;
  }

protected:
  // Allow private copying for use in Handles.
  ReferenceClassApiTest_Errors(const ReferenceClassApiTest_Errors&) = default;
  ReferenceClassApiTest_Errors& operator=(const ReferenceClassApiTest_Errors&) = default;

  static const char* _schema_hash() { return "a0585fca550b0e22524d5f7355084f110e4300c1"; }
  static const int _field_count = 1;

  std::string msg_ = "";
  bool msg_valid_ = false;

  std::string _internal_id_;

  friend class Singleton<ReferenceClassApiTest_Errors>;
  friend class Collection<ReferenceClassApiTest_Errors>;
  friend class Ref<ReferenceClassApiTest_Errors>;
  friend class internal::Accessor;
};

template<>
inline ReferenceClassApiTest_Errors internal::Accessor::clone_entity(const ReferenceClassApiTest_Errors& entity) {
  ReferenceClassApiTest_Errors clone;
  clone.msg_ = entity.msg_;
  clone.msg_valid_ = entity.msg_valid_;
  return clone;
}

template<>
inline size_t internal::Accessor::hash_entity(const ReferenceClassApiTest_Errors& entity) {
  size_t h = 0;
  internal::hash_combine(h, entity._internal_id_);
  if (entity.msg_valid_)
    internal::hash_combine(h, entity.msg_);
  return h;
}

template<>
inline bool internal::Accessor::fields_equal(const ReferenceClassApiTest_Errors& a, const ReferenceClassApiTest_Errors& b) {
  return (a.msg_valid_ ? (b.msg_valid_ && a.msg_ == b.msg_) : !b.msg_valid_);
}

inline bool ReferenceClassApiTest_Errors::operator==(const ReferenceClassApiTest_Errors& other) const {
  return _internal_id_ == other._internal_id_ && fields_equal(*this, other);
}

template<>
inline std::string internal::Accessor::entity_to_str(const ReferenceClassApiTest_Errors& entity, const char* join) {
  internal::StringPrinter printer;
  printer.addId(entity._internal_id_);
  if (entity.msg_valid_)
    printer.add("msg: ", entity.msg_);
  return printer.result(join);
}

template<>
inline void internal::Accessor::decode_entity(ReferenceClassApiTest_Errors* entity, const char* str) {
  if (str == nullptr) return;
  internal::StringDecoder decoder(str);
  decoder.decode(entity->_internal_id_);
  decoder.validate("|");
  for (int i = 0; !decoder.done() && i < ReferenceClassApiTest_Errors::_field_count; i++) {
    std::string name = decoder.upTo(':');
    if (0) {
    } else if (name == "msg") {
      decoder.validate("T");
      decoder.decode(entity->msg_);
      entity->msg_valid_ = true;
    }
    decoder.validate("|");
  }
}

template<>
inline std::string internal::Accessor::encode_entity(const ReferenceClassApiTest_Errors& entity) {
  internal::StringEncoder encoder;
  encoder.encode("", entity._internal_id_);
  if (entity.msg_valid_)
    encoder.encode("msg:T", entity.msg_);
  return encoder.result();
}

}  // namespace arcs

// For STL unordered associative containers. Entities will need to be std::move()-inserted.
template<>
struct std::hash<arcs::ReferenceClassApiTest_Errors> {
  size_t operator()(const arcs::ReferenceClassApiTest_Errors& entity) const {
    return arcs::hash_entity(entity);
  }
};

namespace arcs {

// Aliased as SingletonApiTest_InHandle, SingletonApiTest_OutHandle, SingletonApiTest_IoHandle
class SingletonApiTestInternal1 {
public:
  // Entities must be copied with arcs::clone_entity(), which will exclude the internal id.
  // Move operations are ok (and will include the internal id).
  SingletonApiTestInternal1() = default;
  SingletonApiTestInternal1(SingletonApiTestInternal1&&) = default;
  SingletonApiTestInternal1& operator=(SingletonApiTestInternal1&&) = default;

  template<typename T>
  SingletonApiTestInternal1(const T& other) :
    num_(other.num()), num_valid_(other.has_num()),
    txt_(other.txt()), txt_valid_(other.has_txt())
  {}

  double num() const { return num_; }
  void set_num(double value) { num_ = value; num_valid_ = true; }
  void clear_num() { num_ = 0; num_valid_ = false; }
  bool has_num() const { return num_valid_; }

  const std::string& txt() const { return txt_; }
  void set_txt(const std::string& value) { txt_ = value; txt_valid_ = true; }
  void clear_txt() { txt_ = ""; txt_valid_ = false; }
  bool has_txt() const { return txt_valid_; }

  // Equality ops compare internal ids and all data fields.
  // Use arcs::fields_equal() to compare only the data fields.
  bool operator==(const SingletonApiTestInternal1& other) const;
  bool operator!=(const SingletonApiTestInternal1& other) const { return !(*this == other); }

  // For STL containers.
  friend bool operator<(const SingletonApiTestInternal1& a, const SingletonApiTestInternal1& b) {
    int cmp = a._internal_id_.compare(b._internal_id_);
    if (cmp != 0) return cmp < 0;
    if (a.num_valid_ != b.num_valid_) {
      return !a.num_valid_;
    } else if (a.num_ != b.num_) {
      return a.num_ < b.num_;
    }
    if (a.txt_valid_ != b.txt_valid_) {
      return !a.txt_valid_;
    } else {
      cmp = a.txt_.compare(b.txt_);
      if (cmp != 0) return cmp < 0;
    };
    return false;
  }

protected:
  // Allow private copying for use in Handles.
  SingletonApiTestInternal1(const SingletonApiTestInternal1&) = default;
  SingletonApiTestInternal1& operator=(const SingletonApiTestInternal1&) = default;

  static const char* _schema_hash() { return "b3f278f670fd972c8bac1e3b862505430da66810"; }
  static const int _field_count = 2;

  double num_ = 0;
  bool num_valid_ = false;

  std::string txt_ = "";
  bool txt_valid_ = false;

  std::string _internal_id_;

  friend class Singleton<SingletonApiTestInternal1>;
  friend class Collection<SingletonApiTestInternal1>;
  friend class Ref<SingletonApiTestInternal1>;
  friend class internal::Accessor;
};

using SingletonApiTest_InHandle = SingletonApiTestInternal1;
using SingletonApiTest_OutHandle = SingletonApiTestInternal1;
using SingletonApiTest_IoHandle = SingletonApiTestInternal1;

template<>
inline SingletonApiTestInternal1 internal::Accessor::clone_entity(const SingletonApiTestInternal1& entity) {
  SingletonApiTestInternal1 clone;
  clone.num_ = entity.num_;
  clone.num_valid_ = entity.num_valid_;
  clone.txt_ = entity.txt_;
  clone.txt_valid_ = entity.txt_valid_;
  return clone;
}

template<>
inline size_t internal::Accessor::hash_entity(const SingletonApiTestInternal1& entity) {
  size_t h = 0;
  internal::hash_combine(h, entity._internal_id_);
  if (entity.num_valid_)
    internal::hash_combine(h, entity.num_);
  if (entity.txt_valid_)
    internal::hash_combine(h, entity.txt_);
  return h;
}

template<>
inline bool internal::Accessor::fields_equal(const SingletonApiTestInternal1& a, const SingletonApiTestInternal1& b) {
  return (a.num_valid_ ? (b.num_valid_ && a.num_ == b.num_) : !b.num_valid_) &&
         (a.txt_valid_ ? (b.txt_valid_ && a.txt_ == b.txt_) : !b.txt_valid_);
}

inline bool SingletonApiTestInternal1::operator==(const SingletonApiTestInternal1& other) const {
  return _internal_id_ == other._internal_id_ && fields_equal(*this, other);
}

template<>
inline std::string internal::Accessor::entity_to_str(const SingletonApiTestInternal1& entity, const char* join) {
  internal::StringPrinter printer;
  printer.addId(entity._internal_id_);
  if (entity.num_valid_)
    printer.add("num: ", entity.num_);
  if (entity.txt_valid_)
    printer.add("txt: ", entity.txt_);
  return printer.result(join);
}

template<>
inline void internal::Accessor::decode_entity(SingletonApiTestInternal1* entity, const char* str) {
  if (str == nullptr) return;
  internal::StringDecoder decoder(str);
  decoder.decode(entity->_internal_id_);
  decoder.validate("|");
  for (int i = 0; !decoder.done() && i < SingletonApiTestInternal1::_field_count; i++) {
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
    }
    decoder.validate("|");
  }
}

template<>
inline std::string internal::Accessor::encode_entity(const SingletonApiTestInternal1& entity) {
  internal::StringEncoder encoder;
  encoder.encode("", entity._internal_id_);
  if (entity.num_valid_)
    encoder.encode("num:N", entity.num_);
  if (entity.txt_valid_)
    encoder.encode("txt:T", entity.txt_);
  return encoder.result();
}

}  // namespace arcs

// For STL unordered associative containers. Entities will need to be std::move()-inserted.
template<>
struct std::hash<arcs::SingletonApiTestInternal1> {
  size_t operator()(const arcs::SingletonApiTestInternal1& entity) const {
    return arcs::hash_entity(entity);
  }
};

namespace arcs {

class CollectionApiTest_InHandle {
public:
  // Entities must be copied with arcs::clone_entity(), which will exclude the internal id.
  // Move operations are ok (and will include the internal id).
  CollectionApiTest_InHandle() = default;
  CollectionApiTest_InHandle(CollectionApiTest_InHandle&&) = default;
  CollectionApiTest_InHandle& operator=(CollectionApiTest_InHandle&&) = default;

  template<typename T>
  CollectionApiTest_InHandle(const T& other) :
    num_(other.num()), num_valid_(other.has_num())
  {}

  double num() const { return num_; }
  void set_num(double value) { num_ = value; num_valid_ = true; }
  void clear_num() { num_ = 0; num_valid_ = false; }
  bool has_num() const { return num_valid_; }

  // Equality ops compare internal ids and all data fields.
  // Use arcs::fields_equal() to compare only the data fields.
  bool operator==(const CollectionApiTest_InHandle& other) const;
  bool operator!=(const CollectionApiTest_InHandle& other) const { return !(*this == other); }

  // For STL containers.
  friend bool operator<(const CollectionApiTest_InHandle& a, const CollectionApiTest_InHandle& b) {
    int cmp = a._internal_id_.compare(b._internal_id_);
    if (cmp != 0) return cmp < 0;
    if (a.num_valid_ != b.num_valid_) {
      return !a.num_valid_;
    } else if (a.num_ != b.num_) {
      return a.num_ < b.num_;
    };
    return false;
  }

protected:
  // Allow private copying for use in Handles.
  CollectionApiTest_InHandle(const CollectionApiTest_InHandle&) = default;
  CollectionApiTest_InHandle& operator=(const CollectionApiTest_InHandle&) = default;

  static const char* _schema_hash() { return "1032e45209f910286cfb898c43a1c3ca7d07aea6"; }
  static const int _field_count = 1;

  double num_ = 0;
  bool num_valid_ = false;

  std::string _internal_id_;

  friend class Singleton<CollectionApiTest_InHandle>;
  friend class Collection<CollectionApiTest_InHandle>;
  friend class Ref<CollectionApiTest_InHandle>;
  friend class internal::Accessor;
};

template<>
inline CollectionApiTest_InHandle internal::Accessor::clone_entity(const CollectionApiTest_InHandle& entity) {
  CollectionApiTest_InHandle clone;
  clone.num_ = entity.num_;
  clone.num_valid_ = entity.num_valid_;
  return clone;
}

template<>
inline size_t internal::Accessor::hash_entity(const CollectionApiTest_InHandle& entity) {
  size_t h = 0;
  internal::hash_combine(h, entity._internal_id_);
  if (entity.num_valid_)
    internal::hash_combine(h, entity.num_);
  return h;
}

template<>
inline bool internal::Accessor::fields_equal(const CollectionApiTest_InHandle& a, const CollectionApiTest_InHandle& b) {
  return (a.num_valid_ ? (b.num_valid_ && a.num_ == b.num_) : !b.num_valid_);
}

inline bool CollectionApiTest_InHandle::operator==(const CollectionApiTest_InHandle& other) const {
  return _internal_id_ == other._internal_id_ && fields_equal(*this, other);
}

template<>
inline std::string internal::Accessor::entity_to_str(const CollectionApiTest_InHandle& entity, const char* join) {
  internal::StringPrinter printer;
  printer.addId(entity._internal_id_);
  if (entity.num_valid_)
    printer.add("num: ", entity.num_);
  return printer.result(join);
}

template<>
inline void internal::Accessor::decode_entity(CollectionApiTest_InHandle* entity, const char* str) {
  if (str == nullptr) return;
  internal::StringDecoder decoder(str);
  decoder.decode(entity->_internal_id_);
  decoder.validate("|");
  for (int i = 0; !decoder.done() && i < CollectionApiTest_InHandle::_field_count; i++) {
    std::string name = decoder.upTo(':');
    if (0) {
    } else if (name == "num") {
      decoder.validate("N");
      decoder.decode(entity->num_);
      entity->num_valid_ = true;
    }
    decoder.validate("|");
  }
}

template<>
inline std::string internal::Accessor::encode_entity(const CollectionApiTest_InHandle& entity) {
  internal::StringEncoder encoder;
  encoder.encode("", entity._internal_id_);
  if (entity.num_valid_)
    encoder.encode("num:N", entity.num_);
  return encoder.result();
}

}  // namespace arcs

// For STL unordered associative containers. Entities will need to be std::move()-inserted.
template<>
struct std::hash<arcs::CollectionApiTest_InHandle> {
  size_t operator()(const arcs::CollectionApiTest_InHandle& entity) const {
    return arcs::hash_entity(entity);
  }
};

namespace arcs {

// Aliased as CollectionApiTest_OutHandle, CollectionApiTest_IoHandle
class CollectionApiTestInternal1 {
public:
  // Entities must be copied with arcs::clone_entity(), which will exclude the internal id.
  // Move operations are ok (and will include the internal id).
  CollectionApiTestInternal1() = default;
  CollectionApiTestInternal1(CollectionApiTestInternal1&&) = default;
  CollectionApiTestInternal1& operator=(CollectionApiTestInternal1&&) = default;

  template<typename T>
  CollectionApiTestInternal1(const T& other) :
    num_(other.num()), num_valid_(other.has_num()),
    txt_(other.txt()), txt_valid_(other.has_txt()),
    flg_(other.flg()), flg_valid_(other.has_flg())
  {}

  double num() const { return num_; }
  void set_num(double value) { num_ = value; num_valid_ = true; }
  void clear_num() { num_ = 0; num_valid_ = false; }
  bool has_num() const { return num_valid_; }

  const std::string& txt() const { return txt_; }
  void set_txt(const std::string& value) { txt_ = value; txt_valid_ = true; }
  void clear_txt() { txt_ = ""; txt_valid_ = false; }
  bool has_txt() const { return txt_valid_; }

  bool flg() const { return flg_; }
  void set_flg(bool value) { flg_ = value; flg_valid_ = true; }
  void clear_flg() { flg_ = false; flg_valid_ = false; }
  bool has_flg() const { return flg_valid_; }

  // Equality ops compare internal ids and all data fields.
  // Use arcs::fields_equal() to compare only the data fields.
  bool operator==(const CollectionApiTestInternal1& other) const;
  bool operator!=(const CollectionApiTestInternal1& other) const { return !(*this == other); }

  // For STL containers.
  friend bool operator<(const CollectionApiTestInternal1& a, const CollectionApiTestInternal1& b) {
    int cmp = a._internal_id_.compare(b._internal_id_);
    if (cmp != 0) return cmp < 0;
    if (a.num_valid_ != b.num_valid_) {
      return !a.num_valid_;
    } else if (a.num_ != b.num_) {
      return a.num_ < b.num_;
    }
    if (a.txt_valid_ != b.txt_valid_) {
      return !a.txt_valid_;
    } else {
      cmp = a.txt_.compare(b.txt_);
      if (cmp != 0) return cmp < 0;
    }
    if (a.flg_valid_ != b.flg_valid_) {
      return !a.flg_valid_;
    } else if (a.flg_ != b.flg_) {
      return a.flg_ < b.flg_;
    };
    return false;
  }

protected:
  // Allow private copying for use in Handles.
  CollectionApiTestInternal1(const CollectionApiTestInternal1&) = default;
  CollectionApiTestInternal1& operator=(const CollectionApiTestInternal1&) = default;

  static const char* _schema_hash() { return "196aecdc9ca6cc64c03dad10242babc1954418ec"; }
  static const int _field_count = 3;

  double num_ = 0;
  bool num_valid_ = false;

  std::string txt_ = "";
  bool txt_valid_ = false;

  bool flg_ = false;
  bool flg_valid_ = false;

  std::string _internal_id_;

  friend class Singleton<CollectionApiTestInternal1>;
  friend class Collection<CollectionApiTestInternal1>;
  friend class Ref<CollectionApiTestInternal1>;
  friend class internal::Accessor;
};

using CollectionApiTest_OutHandle = CollectionApiTestInternal1;
using CollectionApiTest_IoHandle = CollectionApiTestInternal1;

template<>
inline CollectionApiTestInternal1 internal::Accessor::clone_entity(const CollectionApiTestInternal1& entity) {
  CollectionApiTestInternal1 clone;
  clone.num_ = entity.num_;
  clone.num_valid_ = entity.num_valid_;
  clone.txt_ = entity.txt_;
  clone.txt_valid_ = entity.txt_valid_;
  clone.flg_ = entity.flg_;
  clone.flg_valid_ = entity.flg_valid_;
  return clone;
}

template<>
inline size_t internal::Accessor::hash_entity(const CollectionApiTestInternal1& entity) {
  size_t h = 0;
  internal::hash_combine(h, entity._internal_id_);
  if (entity.num_valid_)
    internal::hash_combine(h, entity.num_);
  if (entity.txt_valid_)
    internal::hash_combine(h, entity.txt_);
  if (entity.flg_valid_)
    internal::hash_combine(h, entity.flg_);
  return h;
}

template<>
inline bool internal::Accessor::fields_equal(const CollectionApiTestInternal1& a, const CollectionApiTestInternal1& b) {
  return (a.num_valid_ ? (b.num_valid_ && a.num_ == b.num_) : !b.num_valid_) &&
         (a.txt_valid_ ? (b.txt_valid_ && a.txt_ == b.txt_) : !b.txt_valid_) &&
         (a.flg_valid_ ? (b.flg_valid_ && a.flg_ == b.flg_) : !b.flg_valid_);
}

inline bool CollectionApiTestInternal1::operator==(const CollectionApiTestInternal1& other) const {
  return _internal_id_ == other._internal_id_ && fields_equal(*this, other);
}

template<>
inline std::string internal::Accessor::entity_to_str(const CollectionApiTestInternal1& entity, const char* join) {
  internal::StringPrinter printer;
  printer.addId(entity._internal_id_);
  if (entity.num_valid_)
    printer.add("num: ", entity.num_);
  if (entity.txt_valid_)
    printer.add("txt: ", entity.txt_);
  if (entity.flg_valid_)
    printer.add("flg: ", entity.flg_);
  return printer.result(join);
}

template<>
inline void internal::Accessor::decode_entity(CollectionApiTestInternal1* entity, const char* str) {
  if (str == nullptr) return;
  internal::StringDecoder decoder(str);
  decoder.decode(entity->_internal_id_);
  decoder.validate("|");
  for (int i = 0; !decoder.done() && i < CollectionApiTestInternal1::_field_count; i++) {
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
    } else if (name == "flg") {
      decoder.validate("B");
      decoder.decode(entity->flg_);
      entity->flg_valid_ = true;
    }
    decoder.validate("|");
  }
}

template<>
inline std::string internal::Accessor::encode_entity(const CollectionApiTestInternal1& entity) {
  internal::StringEncoder encoder;
  encoder.encode("", entity._internal_id_);
  if (entity.num_valid_)
    encoder.encode("num:N", entity.num_);
  if (entity.txt_valid_)
    encoder.encode("txt:T", entity.txt_);
  if (entity.flg_valid_)
    encoder.encode("flg:B", entity.flg_);
  return encoder.result();
}

}  // namespace arcs

// For STL unordered associative containers. Entities will need to be std::move()-inserted.
template<>
struct std::hash<arcs::CollectionApiTestInternal1> {
  size_t operator()(const arcs::CollectionApiTestInternal1& entity) const {
    return arcs::hash_entity(entity);
  }
};

namespace arcs {

class ReferenceHandlesTest_Res {
public:
  // Entities must be copied with arcs::clone_entity(), which will exclude the internal id.
  // Move operations are ok (and will include the internal id).
  ReferenceHandlesTest_Res() = default;
  ReferenceHandlesTest_Res(ReferenceHandlesTest_Res&&) = default;
  ReferenceHandlesTest_Res& operator=(ReferenceHandlesTest_Res&&) = default;

  template<typename T>
  ReferenceHandlesTest_Res(const T& other) :
    txt_(other.txt()), txt_valid_(other.has_txt())
  {}

  const std::string& txt() const { return txt_; }
  void set_txt(const std::string& value) { txt_ = value; txt_valid_ = true; }
  void clear_txt() { txt_ = ""; txt_valid_ = false; }
  bool has_txt() const { return txt_valid_; }

  // Equality ops compare internal ids and all data fields.
  // Use arcs::fields_equal() to compare only the data fields.
  bool operator==(const ReferenceHandlesTest_Res& other) const;
  bool operator!=(const ReferenceHandlesTest_Res& other) const { return !(*this == other); }

  // For STL containers.
  friend bool operator<(const ReferenceHandlesTest_Res& a, const ReferenceHandlesTest_Res& b) {
    int cmp = a._internal_id_.compare(b._internal_id_);
    if (cmp != 0) return cmp < 0;
    if (a.txt_valid_ != b.txt_valid_) {
      return !a.txt_valid_;
    } else {
      cmp = a.txt_.compare(b.txt_);
      if (cmp != 0) return cmp < 0;
    };
    return false;
  }

protected:
  // Allow private copying for use in Handles.
  ReferenceHandlesTest_Res(const ReferenceHandlesTest_Res&) = default;
  ReferenceHandlesTest_Res& operator=(const ReferenceHandlesTest_Res&) = default;

  static const char* _schema_hash() { return "5c7dd9d914c51f339663d61e3c5065047540ddfb"; }
  static const int _field_count = 1;

  std::string txt_ = "";
  bool txt_valid_ = false;

  std::string _internal_id_;

  friend class Singleton<ReferenceHandlesTest_Res>;
  friend class Collection<ReferenceHandlesTest_Res>;
  friend class Ref<ReferenceHandlesTest_Res>;
  friend class internal::Accessor;
};

template<>
inline ReferenceHandlesTest_Res internal::Accessor::clone_entity(const ReferenceHandlesTest_Res& entity) {
  ReferenceHandlesTest_Res clone;
  clone.txt_ = entity.txt_;
  clone.txt_valid_ = entity.txt_valid_;
  return clone;
}

template<>
inline size_t internal::Accessor::hash_entity(const ReferenceHandlesTest_Res& entity) {
  size_t h = 0;
  internal::hash_combine(h, entity._internal_id_);
  if (entity.txt_valid_)
    internal::hash_combine(h, entity.txt_);
  return h;
}

template<>
inline bool internal::Accessor::fields_equal(const ReferenceHandlesTest_Res& a, const ReferenceHandlesTest_Res& b) {
  return (a.txt_valid_ ? (b.txt_valid_ && a.txt_ == b.txt_) : !b.txt_valid_);
}

inline bool ReferenceHandlesTest_Res::operator==(const ReferenceHandlesTest_Res& other) const {
  return _internal_id_ == other._internal_id_ && fields_equal(*this, other);
}

template<>
inline std::string internal::Accessor::entity_to_str(const ReferenceHandlesTest_Res& entity, const char* join) {
  internal::StringPrinter printer;
  printer.addId(entity._internal_id_);
  if (entity.txt_valid_)
    printer.add("txt: ", entity.txt_);
  return printer.result(join);
}

template<>
inline void internal::Accessor::decode_entity(ReferenceHandlesTest_Res* entity, const char* str) {
  if (str == nullptr) return;
  internal::StringDecoder decoder(str);
  decoder.decode(entity->_internal_id_);
  decoder.validate("|");
  for (int i = 0; !decoder.done() && i < ReferenceHandlesTest_Res::_field_count; i++) {
    std::string name = decoder.upTo(':');
    if (0) {
    } else if (name == "txt") {
      decoder.validate("T");
      decoder.decode(entity->txt_);
      entity->txt_valid_ = true;
    }
    decoder.validate("|");
  }
}

template<>
inline std::string internal::Accessor::encode_entity(const ReferenceHandlesTest_Res& entity) {
  internal::StringEncoder encoder;
  encoder.encode("", entity._internal_id_);
  if (entity.txt_valid_)
    encoder.encode("txt:T", entity.txt_);
  return encoder.result();
}

}  // namespace arcs

// For STL unordered associative containers. Entities will need to be std::move()-inserted.
template<>
struct std::hash<arcs::ReferenceHandlesTest_Res> {
  size_t operator()(const arcs::ReferenceHandlesTest_Res& entity) const {
    return arcs::hash_entity(entity);
  }
};

namespace arcs {

// Aliased as ReferenceHandlesTest_Sng, ReferenceHandlesTest_Col
class ReferenceHandlesTestInternal1 {
public:
  // Entities must be copied with arcs::clone_entity(), which will exclude the internal id.
  // Move operations are ok (and will include the internal id).
  ReferenceHandlesTestInternal1() = default;
  ReferenceHandlesTestInternal1(ReferenceHandlesTestInternal1&&) = default;
  ReferenceHandlesTestInternal1& operator=(ReferenceHandlesTestInternal1&&) = default;

  template<typename T>
  ReferenceHandlesTestInternal1(const T& other) :
    num_(other.num()), num_valid_(other.has_num()),
    txt_(other.txt()), txt_valid_(other.has_txt())
  {}

  double num() const { return num_; }
  void set_num(double value) { num_ = value; num_valid_ = true; }
  void clear_num() { num_ = 0; num_valid_ = false; }
  bool has_num() const { return num_valid_; }

  const std::string& txt() const { return txt_; }
  void set_txt(const std::string& value) { txt_ = value; txt_valid_ = true; }
  void clear_txt() { txt_ = ""; txt_valid_ = false; }
  bool has_txt() const { return txt_valid_; }

  // Equality ops compare internal ids and all data fields.
  // Use arcs::fields_equal() to compare only the data fields.
  bool operator==(const ReferenceHandlesTestInternal1& other) const;
  bool operator!=(const ReferenceHandlesTestInternal1& other) const { return !(*this == other); }

  // For STL containers.
  friend bool operator<(const ReferenceHandlesTestInternal1& a, const ReferenceHandlesTestInternal1& b) {
    int cmp = a._internal_id_.compare(b._internal_id_);
    if (cmp != 0) return cmp < 0;
    if (a.num_valid_ != b.num_valid_) {
      return !a.num_valid_;
    } else if (a.num_ != b.num_) {
      return a.num_ < b.num_;
    }
    if (a.txt_valid_ != b.txt_valid_) {
      return !a.txt_valid_;
    } else {
      cmp = a.txt_.compare(b.txt_);
      if (cmp != 0) return cmp < 0;
    };
    return false;
  }

protected:
  // Allow private copying for use in Handles.
  ReferenceHandlesTestInternal1(const ReferenceHandlesTestInternal1&) = default;
  ReferenceHandlesTestInternal1& operator=(const ReferenceHandlesTestInternal1&) = default;

  static const char* _schema_hash() { return "b3f278f670fd972c8bac1e3b862505430da66810"; }
  static const int _field_count = 2;

  double num_ = 0;
  bool num_valid_ = false;

  std::string txt_ = "";
  bool txt_valid_ = false;

  std::string _internal_id_;

  friend class Singleton<ReferenceHandlesTestInternal1>;
  friend class Collection<ReferenceHandlesTestInternal1>;
  friend class Ref<ReferenceHandlesTestInternal1>;
  friend class internal::Accessor;
};

using ReferenceHandlesTest_Sng = ReferenceHandlesTestInternal1;
using ReferenceHandlesTest_Col = ReferenceHandlesTestInternal1;

template<>
inline ReferenceHandlesTestInternal1 internal::Accessor::clone_entity(const ReferenceHandlesTestInternal1& entity) {
  ReferenceHandlesTestInternal1 clone;
  clone.num_ = entity.num_;
  clone.num_valid_ = entity.num_valid_;
  clone.txt_ = entity.txt_;
  clone.txt_valid_ = entity.txt_valid_;
  return clone;
}

template<>
inline size_t internal::Accessor::hash_entity(const ReferenceHandlesTestInternal1& entity) {
  size_t h = 0;
  internal::hash_combine(h, entity._internal_id_);
  if (entity.num_valid_)
    internal::hash_combine(h, entity.num_);
  if (entity.txt_valid_)
    internal::hash_combine(h, entity.txt_);
  return h;
}

template<>
inline bool internal::Accessor::fields_equal(const ReferenceHandlesTestInternal1& a, const ReferenceHandlesTestInternal1& b) {
  return (a.num_valid_ ? (b.num_valid_ && a.num_ == b.num_) : !b.num_valid_) &&
         (a.txt_valid_ ? (b.txt_valid_ && a.txt_ == b.txt_) : !b.txt_valid_);
}

inline bool ReferenceHandlesTestInternal1::operator==(const ReferenceHandlesTestInternal1& other) const {
  return _internal_id_ == other._internal_id_ && fields_equal(*this, other);
}

template<>
inline std::string internal::Accessor::entity_to_str(const ReferenceHandlesTestInternal1& entity, const char* join) {
  internal::StringPrinter printer;
  printer.addId(entity._internal_id_);
  if (entity.num_valid_)
    printer.add("num: ", entity.num_);
  if (entity.txt_valid_)
    printer.add("txt: ", entity.txt_);
  return printer.result(join);
}

template<>
inline void internal::Accessor::decode_entity(ReferenceHandlesTestInternal1* entity, const char* str) {
  if (str == nullptr) return;
  internal::StringDecoder decoder(str);
  decoder.decode(entity->_internal_id_);
  decoder.validate("|");
  for (int i = 0; !decoder.done() && i < ReferenceHandlesTestInternal1::_field_count; i++) {
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
    }
    decoder.validate("|");
  }
}

template<>
inline std::string internal::Accessor::encode_entity(const ReferenceHandlesTestInternal1& entity) {
  internal::StringEncoder encoder;
  encoder.encode("", entity._internal_id_);
  if (entity.num_valid_)
    encoder.encode("num:N", entity.num_);
  if (entity.txt_valid_)
    encoder.encode("txt:T", entity.txt_);
  return encoder.result();
}

}  // namespace arcs

// For STL unordered associative containers. Entities will need to be std::move()-inserted.
template<>
struct std::hash<arcs::ReferenceHandlesTestInternal1> {
  size_t operator()(const arcs::ReferenceHandlesTestInternal1& entity) const {
    return arcs::hash_entity(entity);
  }
};

namespace arcs {

// Aliased as SchemaReferenceFieldsTest_Input_Ref, SchemaReferenceFieldsTest_Output_Ref
class SchemaReferenceFieldsTestInternal1 {
public:
  // Entities must be copied with arcs::clone_entity(), which will exclude the internal id.
  // Move operations are ok (and will include the internal id).
  SchemaReferenceFieldsTestInternal1() = default;
  SchemaReferenceFieldsTestInternal1(SchemaReferenceFieldsTestInternal1&&) = default;
  SchemaReferenceFieldsTestInternal1& operator=(SchemaReferenceFieldsTestInternal1&&) = default;

  template<typename T>
  SchemaReferenceFieldsTestInternal1(const T& other) :
    val_(other.val()), val_valid_(other.has_val())
  {}

  const std::string& val() const { return val_; }
  void set_val(const std::string& value) { val_ = value; val_valid_ = true; }
  void clear_val() { val_ = ""; val_valid_ = false; }
  bool has_val() const { return val_valid_; }

  // Equality ops compare internal ids and all data fields.
  // Use arcs::fields_equal() to compare only the data fields.
  bool operator==(const SchemaReferenceFieldsTestInternal1& other) const;
  bool operator!=(const SchemaReferenceFieldsTestInternal1& other) const { return !(*this == other); }

  // For STL containers.
  friend bool operator<(const SchemaReferenceFieldsTestInternal1& a, const SchemaReferenceFieldsTestInternal1& b) {
    int cmp = a._internal_id_.compare(b._internal_id_);
    if (cmp != 0) return cmp < 0;
    if (a.val_valid_ != b.val_valid_) {
      return !a.val_valid_;
    } else {
      cmp = a.val_.compare(b.val_);
      if (cmp != 0) return cmp < 0;
    };
    return false;
  }

protected:
  // Allow private copying for use in Handles.
  SchemaReferenceFieldsTestInternal1(const SchemaReferenceFieldsTestInternal1&) = default;
  SchemaReferenceFieldsTestInternal1& operator=(const SchemaReferenceFieldsTestInternal1&) = default;

  static const char* _schema_hash() { return "485712110d89359a3e539dac987329cd2649d889"; }
  static const int _field_count = 1;

  std::string val_ = "";
  bool val_valid_ = false;

  std::string _internal_id_;

  friend class Singleton<SchemaReferenceFieldsTestInternal1>;
  friend class Collection<SchemaReferenceFieldsTestInternal1>;
  friend class Ref<SchemaReferenceFieldsTestInternal1>;
  friend class internal::Accessor;
};

using SchemaReferenceFieldsTest_Input_Ref = SchemaReferenceFieldsTestInternal1;
using SchemaReferenceFieldsTest_Output_Ref = SchemaReferenceFieldsTestInternal1;

template<>
inline SchemaReferenceFieldsTestInternal1 internal::Accessor::clone_entity(const SchemaReferenceFieldsTestInternal1& entity) {
  SchemaReferenceFieldsTestInternal1 clone;
  clone.val_ = entity.val_;
  clone.val_valid_ = entity.val_valid_;
  return clone;
}

template<>
inline size_t internal::Accessor::hash_entity(const SchemaReferenceFieldsTestInternal1& entity) {
  size_t h = 0;
  internal::hash_combine(h, entity._internal_id_);
  if (entity.val_valid_)
    internal::hash_combine(h, entity.val_);
  return h;
}

template<>
inline bool internal::Accessor::fields_equal(const SchemaReferenceFieldsTestInternal1& a, const SchemaReferenceFieldsTestInternal1& b) {
  return (a.val_valid_ ? (b.val_valid_ && a.val_ == b.val_) : !b.val_valid_);
}

inline bool SchemaReferenceFieldsTestInternal1::operator==(const SchemaReferenceFieldsTestInternal1& other) const {
  return _internal_id_ == other._internal_id_ && fields_equal(*this, other);
}

template<>
inline std::string internal::Accessor::entity_to_str(const SchemaReferenceFieldsTestInternal1& entity, const char* join) {
  internal::StringPrinter printer;
  printer.addId(entity._internal_id_);
  if (entity.val_valid_)
    printer.add("val: ", entity.val_);
  return printer.result(join);
}

template<>
inline void internal::Accessor::decode_entity(SchemaReferenceFieldsTestInternal1* entity, const char* str) {
  if (str == nullptr) return;
  internal::StringDecoder decoder(str);
  decoder.decode(entity->_internal_id_);
  decoder.validate("|");
  for (int i = 0; !decoder.done() && i < SchemaReferenceFieldsTestInternal1::_field_count; i++) {
    std::string name = decoder.upTo(':');
    if (0) {
    } else if (name == "val") {
      decoder.validate("T");
      decoder.decode(entity->val_);
      entity->val_valid_ = true;
    }
    decoder.validate("|");
  }
}

template<>
inline std::string internal::Accessor::encode_entity(const SchemaReferenceFieldsTestInternal1& entity) {
  internal::StringEncoder encoder;
  encoder.encode("", entity._internal_id_);
  if (entity.val_valid_)
    encoder.encode("val:T", entity.val_);
  return encoder.result();
}

}  // namespace arcs

// For STL unordered associative containers. Entities will need to be std::move()-inserted.
template<>
struct std::hash<arcs::SchemaReferenceFieldsTestInternal1> {
  size_t operator()(const arcs::SchemaReferenceFieldsTestInternal1& entity) const {
    return arcs::hash_entity(entity);
  }
};

namespace arcs {

class SchemaReferenceFieldsTest_Res {
public:
  // Entities must be copied with arcs::clone_entity(), which will exclude the internal id.
  // Move operations are ok (and will include the internal id).
  SchemaReferenceFieldsTest_Res() = default;
  SchemaReferenceFieldsTest_Res(SchemaReferenceFieldsTest_Res&&) = default;
  SchemaReferenceFieldsTest_Res& operator=(SchemaReferenceFieldsTest_Res&&) = default;

  template<typename T>
  SchemaReferenceFieldsTest_Res(const T& other) :
    txt_(other.txt()), txt_valid_(other.has_txt())
  {}

  const std::string& txt() const { return txt_; }
  void set_txt(const std::string& value) { txt_ = value; txt_valid_ = true; }
  void clear_txt() { txt_ = ""; txt_valid_ = false; }
  bool has_txt() const { return txt_valid_; }

  // Equality ops compare internal ids and all data fields.
  // Use arcs::fields_equal() to compare only the data fields.
  bool operator==(const SchemaReferenceFieldsTest_Res& other) const;
  bool operator!=(const SchemaReferenceFieldsTest_Res& other) const { return !(*this == other); }

  // For STL containers.
  friend bool operator<(const SchemaReferenceFieldsTest_Res& a, const SchemaReferenceFieldsTest_Res& b) {
    int cmp = a._internal_id_.compare(b._internal_id_);
    if (cmp != 0) return cmp < 0;
    if (a.txt_valid_ != b.txt_valid_) {
      return !a.txt_valid_;
    } else {
      cmp = a.txt_.compare(b.txt_);
      if (cmp != 0) return cmp < 0;
    };
    return false;
  }

protected:
  // Allow private copying for use in Handles.
  SchemaReferenceFieldsTest_Res(const SchemaReferenceFieldsTest_Res&) = default;
  SchemaReferenceFieldsTest_Res& operator=(const SchemaReferenceFieldsTest_Res&) = default;

  static const char* _schema_hash() { return "5c7dd9d914c51f339663d61e3c5065047540ddfb"; }
  static const int _field_count = 1;

  std::string txt_ = "";
  bool txt_valid_ = false;

  std::string _internal_id_;

  friend class Singleton<SchemaReferenceFieldsTest_Res>;
  friend class Collection<SchemaReferenceFieldsTest_Res>;
  friend class Ref<SchemaReferenceFieldsTest_Res>;
  friend class internal::Accessor;
};

template<>
inline SchemaReferenceFieldsTest_Res internal::Accessor::clone_entity(const SchemaReferenceFieldsTest_Res& entity) {
  SchemaReferenceFieldsTest_Res clone;
  clone.txt_ = entity.txt_;
  clone.txt_valid_ = entity.txt_valid_;
  return clone;
}

template<>
inline size_t internal::Accessor::hash_entity(const SchemaReferenceFieldsTest_Res& entity) {
  size_t h = 0;
  internal::hash_combine(h, entity._internal_id_);
  if (entity.txt_valid_)
    internal::hash_combine(h, entity.txt_);
  return h;
}

template<>
inline bool internal::Accessor::fields_equal(const SchemaReferenceFieldsTest_Res& a, const SchemaReferenceFieldsTest_Res& b) {
  return (a.txt_valid_ ? (b.txt_valid_ && a.txt_ == b.txt_) : !b.txt_valid_);
}

inline bool SchemaReferenceFieldsTest_Res::operator==(const SchemaReferenceFieldsTest_Res& other) const {
  return _internal_id_ == other._internal_id_ && fields_equal(*this, other);
}

template<>
inline std::string internal::Accessor::entity_to_str(const SchemaReferenceFieldsTest_Res& entity, const char* join) {
  internal::StringPrinter printer;
  printer.addId(entity._internal_id_);
  if (entity.txt_valid_)
    printer.add("txt: ", entity.txt_);
  return printer.result(join);
}

template<>
inline void internal::Accessor::decode_entity(SchemaReferenceFieldsTest_Res* entity, const char* str) {
  if (str == nullptr) return;
  internal::StringDecoder decoder(str);
  decoder.decode(entity->_internal_id_);
  decoder.validate("|");
  for (int i = 0; !decoder.done() && i < SchemaReferenceFieldsTest_Res::_field_count; i++) {
    std::string name = decoder.upTo(':');
    if (0) {
    } else if (name == "txt") {
      decoder.validate("T");
      decoder.decode(entity->txt_);
      entity->txt_valid_ = true;
    }
    decoder.validate("|");
  }
}

template<>
inline std::string internal::Accessor::encode_entity(const SchemaReferenceFieldsTest_Res& entity) {
  internal::StringEncoder encoder;
  encoder.encode("", entity._internal_id_);
  if (entity.txt_valid_)
    encoder.encode("txt:T", entity.txt_);
  return encoder.result();
}

}  // namespace arcs

// For STL unordered associative containers. Entities will need to be std::move()-inserted.
template<>
struct std::hash<arcs::SchemaReferenceFieldsTest_Res> {
  size_t operator()(const arcs::SchemaReferenceFieldsTest_Res& entity) const {
    return arcs::hash_entity(entity);
  }
};

namespace arcs {

// Aliased as SchemaReferenceFieldsTest_Input, SchemaReferenceFieldsTest_Output
class SchemaReferenceFieldsTestInternal2 {
public:
  // Entities must be copied with arcs::clone_entity(), which will exclude the internal id.
  // Move operations are ok (and will include the internal id).
  SchemaReferenceFieldsTestInternal2() = default;
  SchemaReferenceFieldsTestInternal2(SchemaReferenceFieldsTestInternal2&&) = default;
  SchemaReferenceFieldsTestInternal2& operator=(SchemaReferenceFieldsTestInternal2&&) = default;

  template<typename T>
  SchemaReferenceFieldsTestInternal2(const T& other) :
    num_(other.num()), num_valid_(other.has_num()),
    txt_(other.txt()), txt_valid_(other.has_txt()),
    ref_(other.ref())
  {}

  double num() const { return num_; }
  void set_num(double value) { num_ = value; num_valid_ = true; }
  void clear_num() { num_ = 0; num_valid_ = false; }
  bool has_num() const { return num_valid_; }

  const std::string& txt() const { return txt_; }
  void set_txt(const std::string& value) { txt_ = value; txt_valid_ = true; }
  void clear_txt() { txt_ = ""; txt_valid_ = false; }
  bool has_txt() const { return txt_valid_; }

  const Ref<SchemaReferenceFieldsTestInternal1>& ref() const { return ref_; }
  void bind_ref(const SchemaReferenceFieldsTestInternal1& value) { internal::Accessor::bind(&ref_, value); }

  // Equality ops compare internal ids and all data fields.
  // Use arcs::fields_equal() to compare only the data fields.
  bool operator==(const SchemaReferenceFieldsTestInternal2& other) const;
  bool operator!=(const SchemaReferenceFieldsTestInternal2& other) const { return !(*this == other); }

  // For STL containers.
  friend bool operator<(const SchemaReferenceFieldsTestInternal2& a, const SchemaReferenceFieldsTestInternal2& b) {
    int cmp = a._internal_id_.compare(b._internal_id_);
    if (cmp != 0) return cmp < 0;
    if (a.num_valid_ != b.num_valid_) {
      return !a.num_valid_;
    } else if (a.num_ != b.num_) {
      return a.num_ < b.num_;
    }
    if (a.txt_valid_ != b.txt_valid_) {
      return !a.txt_valid_;
    } else {
      cmp = a.txt_.compare(b.txt_);
      if (cmp != 0) return cmp < 0;
    }
    if (a.ref_ != b.ref_) {
      return a.ref_ < b.ref_;
    };
    return false;
  }

protected:
  // Allow private copying for use in Handles.
  SchemaReferenceFieldsTestInternal2(const SchemaReferenceFieldsTestInternal2&) = default;
  SchemaReferenceFieldsTestInternal2& operator=(const SchemaReferenceFieldsTestInternal2&) = default;

  static const char* _schema_hash() { return "8aefce76994b4c77f79361f4297dd4762fffc757"; }
  static const int _field_count = 3;

  double num_ = 0;
  bool num_valid_ = false;

  std::string txt_ = "";
  bool txt_valid_ = false;

  Ref<SchemaReferenceFieldsTestInternal1> ref_;

  std::string _internal_id_;

  friend class Singleton<SchemaReferenceFieldsTestInternal2>;
  friend class Collection<SchemaReferenceFieldsTestInternal2>;
  friend class Ref<SchemaReferenceFieldsTestInternal2>;
  friend class internal::Accessor;
};

using SchemaReferenceFieldsTest_Input = SchemaReferenceFieldsTestInternal2;
using SchemaReferenceFieldsTest_Output = SchemaReferenceFieldsTestInternal2;

template<>
inline SchemaReferenceFieldsTestInternal2 internal::Accessor::clone_entity(const SchemaReferenceFieldsTestInternal2& entity) {
  SchemaReferenceFieldsTestInternal2 clone;
  clone.num_ = entity.num_;
  clone.num_valid_ = entity.num_valid_;
  clone.txt_ = entity.txt_;
  clone.txt_valid_ = entity.txt_valid_;
  clone.ref_ = entity.ref_;
  return clone;
}

template<>
inline size_t internal::Accessor::hash_entity(const SchemaReferenceFieldsTestInternal2& entity) {
  size_t h = 0;
  internal::hash_combine(h, entity._internal_id_);
  if (entity.num_valid_)
    internal::hash_combine(h, entity.num_);
  if (entity.txt_valid_)
    internal::hash_combine(h, entity.txt_);
  if (entity.ref_._internal_id_ != "")
    internal::hash_combine(h, entity.ref_);
  return h;
}

template<>
inline bool internal::Accessor::fields_equal(const SchemaReferenceFieldsTestInternal2& a, const SchemaReferenceFieldsTestInternal2& b) {
  return (a.num_valid_ ? (b.num_valid_ && a.num_ == b.num_) : !b.num_valid_) &&
         (a.txt_valid_ ? (b.txt_valid_ && a.txt_ == b.txt_) : !b.txt_valid_) &&
         (a.ref_ == b.ref_);
}

inline bool SchemaReferenceFieldsTestInternal2::operator==(const SchemaReferenceFieldsTestInternal2& other) const {
  return _internal_id_ == other._internal_id_ && fields_equal(*this, other);
}

template<>
inline std::string internal::Accessor::entity_to_str(const SchemaReferenceFieldsTestInternal2& entity, const char* join) {
  internal::StringPrinter printer;
  printer.addId(entity._internal_id_);
  if (entity.num_valid_)
    printer.add("num: ", entity.num_);
  if (entity.txt_valid_)
    printer.add("txt: ", entity.txt_);
  if (entity.ref_._internal_id_ != "")
    printer.add("ref: ", entity.ref_);
  return printer.result(join);
}

template<>
inline void internal::Accessor::decode_entity(SchemaReferenceFieldsTestInternal2* entity, const char* str) {
  if (str == nullptr) return;
  internal::StringDecoder decoder(str);
  decoder.decode(entity->_internal_id_);
  decoder.validate("|");
  for (int i = 0; !decoder.done() && i < SchemaReferenceFieldsTestInternal2::_field_count; i++) {
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
    } else if (name == "ref") {
      decoder.validate("R");
      decoder.decode(entity->ref_);
    }
    decoder.validate("|");
  }
}

template<>
inline std::string internal::Accessor::encode_entity(const SchemaReferenceFieldsTestInternal2& entity) {
  internal::StringEncoder encoder;
  encoder.encode("", entity._internal_id_);
  if (entity.num_valid_)
    encoder.encode("num:N", entity.num_);
  if (entity.txt_valid_)
    encoder.encode("txt:T", entity.txt_);
  if (entity.ref_._internal_id_ != "")
    encoder.encode("ref:R", entity.ref_);
  return encoder.result();
}

}  // namespace arcs

// For STL unordered associative containers. Entities will need to be std::move()-inserted.
template<>
struct std::hash<arcs::SchemaReferenceFieldsTestInternal2> {
  size_t operator()(const arcs::SchemaReferenceFieldsTestInternal2& entity) const {
    return arcs::hash_entity(entity);
  }
};

namespace arcs {

// Aliased as UnicodeTest_Sng, UnicodeTest_Col, UnicodeTest_Res
class UnicodeTestInternal1 {
public:
  // Entities must be copied with arcs::clone_entity(), which will exclude the internal id.
  // Move operations are ok (and will include the internal id).
  UnicodeTestInternal1() = default;
  UnicodeTestInternal1(UnicodeTestInternal1&&) = default;
  UnicodeTestInternal1& operator=(UnicodeTestInternal1&&) = default;

  template<typename T>
  UnicodeTestInternal1(const T& other) :
    pass_(other.pass()), pass_valid_(other.has_pass()),
    src_(other.src()), src_valid_(other.has_src())
  {}

  const std::string& pass() const { return pass_; }
  void set_pass(const std::string& value) { pass_ = value; pass_valid_ = true; }
  void clear_pass() { pass_ = ""; pass_valid_ = false; }
  bool has_pass() const { return pass_valid_; }

  const std::string& src() const { return src_; }
  void set_src(const std::string& value) { src_ = value; src_valid_ = true; }
  void clear_src() { src_ = ""; src_valid_ = false; }
  bool has_src() const { return src_valid_; }

  // Equality ops compare internal ids and all data fields.
  // Use arcs::fields_equal() to compare only the data fields.
  bool operator==(const UnicodeTestInternal1& other) const;
  bool operator!=(const UnicodeTestInternal1& other) const { return !(*this == other); }

  // For STL containers.
  friend bool operator<(const UnicodeTestInternal1& a, const UnicodeTestInternal1& b) {
    int cmp = a._internal_id_.compare(b._internal_id_);
    if (cmp != 0) return cmp < 0;
    if (a.pass_valid_ != b.pass_valid_) {
      return !a.pass_valid_;
    } else {
      cmp = a.pass_.compare(b.pass_);
      if (cmp != 0) return cmp < 0;
    }
    if (a.src_valid_ != b.src_valid_) {
      return !a.src_valid_;
    } else {
      cmp = a.src_.compare(b.src_);
      if (cmp != 0) return cmp < 0;
    };
    return false;
  }

protected:
  // Allow private copying for use in Handles.
  UnicodeTestInternal1(const UnicodeTestInternal1&) = default;
  UnicodeTestInternal1& operator=(const UnicodeTestInternal1&) = default;

  static const char* _schema_hash() { return "a8e0ca135306517ec8b837cadc82d98001fac1ff"; }
  static const int _field_count = 2;

  std::string pass_ = "";
  bool pass_valid_ = false;

  std::string src_ = "";
  bool src_valid_ = false;

  std::string _internal_id_;

  friend class Singleton<UnicodeTestInternal1>;
  friend class Collection<UnicodeTestInternal1>;
  friend class Ref<UnicodeTestInternal1>;
  friend class internal::Accessor;
};

using UnicodeTest_Sng = UnicodeTestInternal1;
using UnicodeTest_Col = UnicodeTestInternal1;
using UnicodeTest_Res = UnicodeTestInternal1;

template<>
inline UnicodeTestInternal1 internal::Accessor::clone_entity(const UnicodeTestInternal1& entity) {
  UnicodeTestInternal1 clone;
  clone.pass_ = entity.pass_;
  clone.pass_valid_ = entity.pass_valid_;
  clone.src_ = entity.src_;
  clone.src_valid_ = entity.src_valid_;
  return clone;
}

template<>
inline size_t internal::Accessor::hash_entity(const UnicodeTestInternal1& entity) {
  size_t h = 0;
  internal::hash_combine(h, entity._internal_id_);
  if (entity.pass_valid_)
    internal::hash_combine(h, entity.pass_);
  if (entity.src_valid_)
    internal::hash_combine(h, entity.src_);
  return h;
}

template<>
inline bool internal::Accessor::fields_equal(const UnicodeTestInternal1& a, const UnicodeTestInternal1& b) {
  return (a.pass_valid_ ? (b.pass_valid_ && a.pass_ == b.pass_) : !b.pass_valid_) &&
         (a.src_valid_ ? (b.src_valid_ && a.src_ == b.src_) : !b.src_valid_);
}

inline bool UnicodeTestInternal1::operator==(const UnicodeTestInternal1& other) const {
  return _internal_id_ == other._internal_id_ && fields_equal(*this, other);
}

template<>
inline std::string internal::Accessor::entity_to_str(const UnicodeTestInternal1& entity, const char* join) {
  internal::StringPrinter printer;
  printer.addId(entity._internal_id_);
  if (entity.pass_valid_)
    printer.add("pass: ", entity.pass_);
  if (entity.src_valid_)
    printer.add("src: ", entity.src_);
  return printer.result(join);
}

template<>
inline void internal::Accessor::decode_entity(UnicodeTestInternal1* entity, const char* str) {
  if (str == nullptr) return;
  internal::StringDecoder decoder(str);
  decoder.decode(entity->_internal_id_);
  decoder.validate("|");
  for (int i = 0; !decoder.done() && i < UnicodeTestInternal1::_field_count; i++) {
    std::string name = decoder.upTo(':');
    if (0) {
    } else if (name == "pass") {
      decoder.validate("T");
      decoder.decode(entity->pass_);
      entity->pass_valid_ = true;
    } else if (name == "src") {
      decoder.validate("T");
      decoder.decode(entity->src_);
      entity->src_valid_ = true;
    }
    decoder.validate("|");
  }
}

template<>
inline std::string internal::Accessor::encode_entity(const UnicodeTestInternal1& entity) {
  internal::StringEncoder encoder;
  encoder.encode("", entity._internal_id_);
  if (entity.pass_valid_)
    encoder.encode("pass:T", entity.pass_);
  if (entity.src_valid_)
    encoder.encode("src:T", entity.src_);
  return encoder.result();
}

}  // namespace arcs

// For STL unordered associative containers. Entities will need to be std::move()-inserted.
template<>
struct std::hash<arcs::UnicodeTestInternal1> {
  size_t operator()(const arcs::UnicodeTestInternal1& entity) const {
    return arcs::hash_entity(entity);
  }
};

#endif
