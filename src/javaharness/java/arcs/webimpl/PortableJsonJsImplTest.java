package arcs.webimpl;

import arcs.api.PortableJson;

import java.util.Arrays;

public class PortableJsonJsImplTest {
  public static void testEmpty() {
    PortableJsonParserImpl parser = new PortableJsonParserImpl();
    PortableJson obj = parser.emptyObject();
    PortableJson arr = parser.emptyArray();
    assert obj.keys().size() == 0;
    assert arr.getLength() == 0;
  }

  public static void testObject() {
    PortableJsonParserImpl parser = new PortableJsonParserImpl();
    PortableJson obj = parser.emptyObject();
    String str = "string";
    int i = 123;
    double num = 4.5;
    boolean bool = true;
    PortableJson innerObj = parser.parse("{\"foo\" : \"bar\"}");
    obj.put("str", str);
    obj.put("int", i);
    obj.put("num", num);
    obj.put("bool", bool);
    obj.put("obj", innerObj);

    assert Arrays.equals(obj.keys().toArray(), new String[] {"str", "int", "num", "bool", "obj"});

    assert obj.getString("str") == str;
    assert obj.getInt("int") == i;
    assert obj.getNumber("num") == num;
    assert obj.getBool("bool") == bool;
    assert innerObj.equals(obj.getObject("obj"));
    assert parser.stringify(obj.getObject("obj")) == parser.stringify(innerObj);

    assert obj.equals(parser.parse(parser.stringify(obj)));
    assert parser.stringify(obj) == parser.stringify(parser.parse(parser.stringify(obj)));

    assert !obj.equals(innerObj);
    assert !innerObj.equals(obj);
  }

  public static void testArray() {
    PortableJsonParserImpl parser = new PortableJsonParserImpl();
    PortableJson obj = parser.emptyArray();
    String str = "string";
    int i = 123;
    double num = 4.5;
    boolean bool = true;
    PortableJson innerObj = parser.parse("{\"foo\" : \"bar\"}");
    obj.put(0, str);
    obj.put(1, i);
    obj.put(2, num);
    obj.put(3, bool);
    obj.put(4, innerObj);
    assert obj.getLength() == 5;
    assert obj.getString(0) == str;
    assert obj.getInt(1) == i;
    assert obj.getNumber(2) == num;
    assert obj.getBool(3) == bool;
    assert parser.stringify(obj.getObject(4)) == parser.stringify(innerObj);
    assert parser.stringify(obj) == parser.stringify(parser.parse(parser.stringify(obj)));
    assert parser
            .parse(parser.stringify(parser.parse(parser.stringify(obj))))
            .equals(parser.parse(parser.stringify(obj)))
        : "oi";
    assert obj.equals(parser.parse(parser.stringify(obj)));
    assert !obj.equals(innerObj);
    assert !innerObj.equals(obj);
  }
}
