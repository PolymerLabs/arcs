package arcs.android.impl;

import arcs.api.PortableJson;
import arcs.api.PortableJsonParser;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Objects;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.junit.runners.JUnit4;

@RunWith(JUnit4.class)
public class PortableJsonAndroidImplTest {
  // TODO(cromwellian): use dependendency injection to make these tests run on all platforms
  @Test
  public void testEmpty() {
    PortableJsonParser parser = new PortableJsonParserAndroidImpl();
    PortableJson obj = parser.emptyObject();
    PortableJson arr = parser.emptyArray();
    assert obj.keys().size() == 0;
    assert arr.getLength() == 0;
  }

  @Test
  public void testObject() {
    PortableJsonParser parser = new PortableJsonParserAndroidImpl();
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

    assert new HashSet<>(Arrays.asList(obj.keys().toArray()))
        .equals(new HashSet<>(Arrays.asList("str", "int", "num", "bool", "obj")));

    assert Objects.equals(obj.getString("str"), str);
    System.err.println("int is " + obj.getInt("int") + " vs " + i);
    assert obj.getInt("int") == i;
    assert obj.getNumber("num") == num;
    assert obj.getBool("bool") == bool;
    assert innerObj.equals(obj.getObject("obj"));
    assert Objects.equals(parser.stringify(obj.getObject("obj")), parser.stringify(innerObj));

    assert obj.equals(parser.parse(parser.stringify(obj)));
    assert Objects.equals(
        parser.stringify(obj), parser.stringify(parser.parse(parser.stringify(obj))));

    assert !obj.equals(innerObj);
    assert !innerObj.equals(obj);
  }

  @Test
  public void testArray() {
    System.err.println("Hello");
    PortableJsonParser parser = new PortableJsonParserAndroidImpl();
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
    assert Objects.equals(obj.getString(0), str);
    assert obj.getInt(1) == i;
    assert obj.getNumber(2) == num;
    assert obj.getBool(3) == bool;
    assert Objects.equals(parser.stringify(obj.getObject(4)), parser.stringify(innerObj));
    assert Objects.equals(
        parser.stringify(obj), parser.stringify(parser.parse(parser.stringify(obj))));
    System.out.println(parser.stringify(obj));
    assert parser
            .parse(parser.stringify(parser.parse(parser.stringify(obj))))
            .equals(parser.parse(parser.stringify(obj)))
        : "oi";
    assert obj.equals(parser.parse(parser.stringify(obj)));
    assert !obj.equals(innerObj);
    assert !innerObj.equals(obj);
  }
}
