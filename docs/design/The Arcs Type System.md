<!-- Output copied to clipboard! -->

<!-----

You have some errors, warnings, or alerts. If you are using reckless mode, turn it off to see inline alerts.
* ERRORs: 5
* WARNINGs: 0
* ALERTS: 9

Conversion time: 3.019 seconds.


Using this Markdown file:

1. Paste this output into your source file.
2. See the notes and action items below regarding this conversion run.
3. Check the rendered output (headings, lists, code blocks, tables) for proper
   formatting and use a linkchecker before you publish this page.

Conversion notes:

* Docs to Markdown version 1.0β34
* Thu Feb 02 2023 21:01:07 GMT-0800 (PST)
* Source doc: Copy of The Arcs Type System for export

ERROR:
undefined internal link to this URL: "#heading=h.mexp5vkd7ppk".link text: Type Variables
?Did you generate a TOC with blue links?


ERROR:
undefined internal link to this URL: "#heading=h.9l3kmsorduhz".link text: Collections
?Did you generate a TOC with blue links?


ERROR:
undefined internal link to this URL: "#heading=h.gpz0scyhntlb".link text: CRDT Typing of Entity Fields
?Did you generate a TOC with blue links?


ERROR:
undefined internal link to this URL: "#heading=h.9kmycscky0zw".link text: relevant section below
?Did you generate a TOC with blue links?


ERROR:
undefined internal link to this URL: "#heading=h.fojpvke7teyn".link text: Preserving Entity State
?Did you generate a TOC with blue links?

* This document has images: check for >>>>>  gd2md-html alert:  inline image link in generated source and store images to your server. NOTE: Images in exported zip file from Google Docs may not appear in  the same order as they do in your doc. Please check the images!

----->


<p style="color: red; font-weight: bold">>>>>>  gd2md-html alert:  ERRORs: 5; WARNINGs: 0; ALERTS: 9.</p>
<ul style="color: red; font-weight: bold"><li>See top comment block for details on ERRORs and WARNINGs. <li>In the converted Markdown or HTML, search for inline alerts that start with >>>>>  gd2md-html alert:  for specific instances that need correction.</ul>

<p style="color: red; font-weight: bold">Links to alert messages:</p><a href="#gdcalert1">alert1</a>
<a href="#gdcalert2">alert2</a>
<a href="#gdcalert3">alert3</a>
<a href="#gdcalert4">alert4</a>
<a href="#gdcalert5">alert5</a>
<a href="#gdcalert6">alert6</a>
<a href="#gdcalert7">alert7</a>
<a href="#gdcalert8">alert8</a>
<a href="#gdcalert9">alert9</a>

<p style="color: red; font-weight: bold">>>>>> PLEASE check and correct alert issues and delete this message and the inline alerts.<hr></p>



# The Arcs Type System

_[go/arcs-type-system](http://go/arcs-type-system), shans@, Dec 2018_


## Introduction

TODO(shans): This document describes the Arcs Type System in depth, starting from a high-level description of what the type system attempts to achieve.

Describe at a high level the concept of a recipe. Note that it’s made of particles, which have connections, which are given constraints by their developers in terms of what kinds of inputs are expected and what kinds of outputs will be generated.

Describe that handles and handle connections are typed, and that types can be data (i.e. entities), or slots, or interfaces (behavior). Give a couple of illustrating examples, maybe focussed on entities.

TODO(shans): Describe that while the details are complicated, the type system overall is set up to do the expected thing in most cases. Give examples?


## Design Goals



* Aid recipe construction by maximizing ability to declaratively express particle behaviour - because two particles with incompatible types **can’t **communicate effectively, increasing the granularity and expressiveness of the type system increases the likelihood that two particles with compatible types **can** communicate.
* Allow developers to statically express expectations about the particles they author, and connect these static expressions to an ecosystem of testing & feedback - during development, in production, and in the cloud.
* Empower developers by allowing them to express data transformations and other complex concepts in a static, declarative, type-checked and maintainable manner.
* Enable high-quality developer tooling that empowers developers (e.g. by providing more useful error messages during development and at runtime, by providing reflection hooks for developer tools, etc.)
* Provide guiding information & enhancements to static dataflow analysis.


## Types Overview

There are 3 fundamental types:



* Entities represent data
* Slots represent rendering opportunities
* Interfaces represent behavior

All data flows through a recipe are described in terms of combinations of these types. Furthermore, these dataflows are audited at runtime to ensure that data matches the assigned type.

Note that we do not _type-check_ inside particles - we don’t have the ability to do this for arbitrary types and arbitrary languages. Instead we use a type contract style approach to assert that input and output data matches expectations.

From a particle developer’s perspective, typing the inputs to a particle means that they can describe exactly the requirements their particle has. This simplifies the programming model significantly - for example, developers don’t need to deal with optional fields (which crop up when working with protobufs and similar approaches) or overly specific schemas (like those provided by schema.org).

The cost from a developer’s perspective is that outputs need to be cleanly typed too - though here, development tools can assist significantly.


## Fundamental Concepts


### Type Ordering

A type describes a set of constraints that are universally true for instances of that type. One type A can be _represented _by another type B if every constraint on A is also true for B - in other words, B is a [subtype](https://www.google.com/url?q=https://en.wikipedia.org/wiki/Subtyping&sa=D&ust=1551507573091000&usg=AFQjCNFTlZ6imc4YiVVlmYwuuXo3NW2Wmw) of A. A familiar example is classes and subclassing: a subclass _represents_ its superclass as every constraint on the superclass (availability of certain methods and members) remains valid on every instance of the subclass.

This representation relation forms a [partial ordering](https://en.wikipedia.org/wiki/Partially_ordered_set) across types. When we speak of a type being “larger than” another type, we mean that it can represent that type. Conversely, a type is 

“smaller than” another type if it can be represented by that type.

Note that because the ordering is partial, it’s possible for a type to be neither larger nor smaller than another type. For example, if two types A and B both contain fields that are not present in the other, then neither A > B nor A &lt; B is correct.


### Meet and Join

For any two members of a partially ordered set, a _join_ and a _meet _may exist. A join of two members A and B in set P:



* is a member of P
* is larger than both A and B
* is smaller than every other member of P that is larger than both A and B

A meet of two members A and B in P:



* is a member of P
* is smaller than both A and B
* is larger than every other member of P that is smaller than both A and B


### The Type Lattice

We describe partially ordered sets for which every pair of members has a join and a meet as forming a lattice.

While the Arcs type system doesn’t form a complete lattice across all types, it does so _locally_, for subsets of types that are likely to be compared against each other.


### Typing a Handle

If a handle has no intrinsic type, a type can be assigned under the following conditions:



* there is a meet, M, of all of the constraints of every connection that writes into the handle
* there is a join, J, of all of the constraints of every connection that reads from the handle
* J is less than M

When these conditions are true, then any type between J and M (i.e. larger than J and less than M) can be used.

A handle with an intrinsic type will type-check if the intrinsic type is one of the assignable types generated by treating the handle as untyped and attempting to type it.

Note that handle typing is more complicated in the presence of type variables. See the [Type Variables](#type-variables) section below for more details.

#### A Motivating Example

In this section we’re going to use entity types to concretize theory with examples. It’s important to note that this approach to type checking extends beyond entity types, and that the concrete mappings from lattice concepts to operations will differ for each type family that is examined.

If a connection wants to read from the handle, then the handle type must be greater than the type that the connection constraints expect. For example, say the connection requires entities called “Product” with a Text field called “foo”. The following types are OK for the handle:


```
    Product {Text foo}
    Product {Text name, Text foo}
```


The following types are not OK for the handle:


```
    Thing {Text foo} // isn't at least Product
    * {Text foo} // isn't at least Product (* is a type with no semantic names)
    Product {Number bar} // doesn't have foo field
    Product {Number foo} // doesn't have foo field of Text type
```


Conversely, if a connection wants to write to the handle, then the handle type must be less than the type that the connection constraints expect. For example, say the connection writes entities called “Product” with a Text field called “foo”. Any of the following types are OK for the handle:


```
    Product {Text foo}
    Product {}
    * {Text foo}
    * {}
```


The following type is not OK for the handle:


```
    Product {Text foo, Number bar} // written data doesn't have bar
```


The smallest type that satisfies all of the read constraints is therefore the join of those constraints. Likewise, the largest type that satisfies all of the write constraints is their meet. Any type between the join and the meet is:



* larger than all of the read constraints
* smaller than all of the write constraints

This is precisely what is required for the handle to be correctly typed: anything written to the handle must be guaranteed to satisfy the handle type, and the handle type must be capable of satisfying the types being read from the handle.

Take the following case of ‘N’ entities with some combinations of fields ‘a’, ‘b’, ‘c’, and ‘d’ being written into and read from a handle H:



<p id="gdcalert2" ><span style="color: red; font-weight: bold">>>>>>  gd2md-html alert: inline image link here (to images/image1.png). Store image on your image server and adjust path/filename/extension if necessary. </span><br>(<a href="#">Back to top</a>)(<a href="#gdcalert3">Next alert</a>)<br><span style="color: red; font-weight: bold">>>>>> </span></p>


![alt_text](images/image1.png "image_tooltip")


First we need to find the join of the read constraints. This derives the minimum expectations we have of the handle - i.e. what has to be true of every piece of data in the handle in order for the read constraints to be satisfiable:



<p id="gdcalert3" ><span style="color: red; font-weight: bold">>>>>>  gd2md-html alert: inline image link here (to images/image2.png). Store image on your image server and adjust path/filename/extension if necessary. </span><br>(<a href="#">Back to top</a>)(<a href="#gdcalert4">Next alert</a>)<br><span style="color: red; font-weight: bold">>>>>> </span></p>


![alt_text](images/image2.png "image_tooltip")


Next we find the meet of the write constraints. This constrains the type in a slightly different way - we can’t guarantee that any data written into the handle has more than the meet:



<p id="gdcalert4" ><span style="color: red; font-weight: bold">>>>>>  gd2md-html alert: inline image link here (to images/image3.png). Store image on your image server and adjust path/filename/extension if necessary. </span><br>(<a href="#">Back to top</a>)(<a href="#gdcalert5">Next alert</a>)<br><span style="color: red; font-weight: bold">>>>>> </span></p>


![alt_text](images/image3.png "image_tooltip")


Putting these together, the type of H can be anything that is at least the join and at most the meet:



<p id="gdcalert5" ><span style="color: red; font-weight: bold">>>>>>  gd2md-html alert: inline image link here (to images/image4.png). Store image on your image server and adjust path/filename/extension if necessary. </span><br>(<a href="#">Back to top</a>)(<a href="#gdcalert6">Next alert</a>)<br><span style="color: red; font-weight: bold">>>>>> </span></p>


![alt_text](images/image4.png "image_tooltip")



## Primitive Types


### Entity Types

Entities are the fundamental unit of data in Arcs. An entity type has two sections:



* 0 or more semantic names
* 0 or more typed fields

**Example**: this entity type has semantic names **Product** and **Thing**, and two fields:


```
schema Product Thing
  Text name
  URL link
```


Semantic names are descriptions of what entities of this type contain. It’s fine to provide a list of names with differing generality - for example, in the above type, both Product and Thing are provided because Products are Things. Order of semantic names is not important - more specific names do not need to be ordered with respect to less specific names.

Fields contain data about the entity, and the following field types are currently supported:



* **Text**: arbitrary textual content
* **URL**: a valid URL [TODO(shans): how do we validate URLs?]
* **Number**: A JavaScript number [TODO(shans): we’ll need to define this in terms of precision for compatibility with Wasm]
* **Boolean**: A true or false value
* **Object**: An arbitrary JSO [TODO(shans): we’ll need to define this in terms of something Wasm can comprehend - a transferrable perhaps?]
* **union of field types**: union of any number of other field types, represented as (e.g.) “`(URL or Number)`”. The field can then contain any value that is valid in any of the listed field types.
* **tuple of field types**: tuple of any number of other field types, represented as (e.g.) “`(URL, Number)`”. The field then contains a tuple containing a valid value for each of the listed types, in order.
* **reference to other Entities**: Reference to another Entity type. See the section below for more details on References.
* **collection of references to other Entities**: Collection of references to another Entity type. As with Collections at the handle level (see the [Collections](#collections) section below), collections of references are sets keyed by the referenced entity ids. In future, it will be possible to provide more complex constructs (ordered lists, etc.) - see the [CRDT Typing of Entity Fields](#crdt-typing-of-entity-fields) section below.

When described in manifest files, Entity types have both a standalone (schema) representation, shown above, and an inline representation. The standalone representation consists of the keyword ‘schema’, followed by a space-separated list of the semantic names (in any order) or a ‘*’ if there are no semantic names, followed by a newline, then a list of the fields in the entity, type first, indented and separated by newlines.

The inline representation omits the ‘schema’ keyword, and places all names and fields on a single line. A star is again used if there are no semantic names. The fields are distinguished by braces and separated by commas.

**Example**: the inline representation of the above entity type is `Product Thing { Text name, URL link }`


#### Unions and Intersections of Field Types

The union or intersection of two field types is given by doing the following:



1. convert both field types to sets:
    1. if the field type is a union, then the set contains each entry in the union
    2. if the field type is not a union, then the set contains exactly the type
2. find the union or intersection of the two sets
3. convert the result back to a field type:
    3. if the set has only one entry, then that entry is the resulting type
    4. otherwise, if the set has multiple entries, then the resulting type is a union of the entries in the set

If an intersection of two field types produces an empty set, then the intersection has failed.

**Examples:**


```
Text ∪ Number = Text or Number
Text or Number ∪ Number = Text or Number
Text or Number ∪ URL or Image = Text or Number or URL or Image
Text ∪ Text = Text

Text ∩ Number has no solution
Text or Number ∩ Number = Number
Text or Number ∩ Text or Number or URL = Text or Number
```



#### Partial Ordering between Entity Types

Let an Entity type A be described by a set of names A<sub>N</sub> and a set of fields A<sub>F</sub>, with each field having a label and a type.

An entity A is less than an entity B (i.e. A is a restricted view of B) if:



* A<sub>N</sub> is a subset of B<sub>N</sub>
* labels(A<sub>F</sub>) is a subset of labels(B<sub>F</sub>)
* for every label in labels(A<sub>F</sub>), the accompanying type in B<sub>F</sub> (when treated as a union) is a subset of the accompanying type in A<sub>F</sub>

This last requirement is somewhat unintuitive. We mentioned above that when a type A is less than a type B, one way to think about what this means is that type B is a subtype of type A. Another way of putting this is that A provides a restricted view of B. This means that type B can introduce new fields (A’s view is restricted such that it can’t see those fields), but type B can’t introduce new types for existing fields, as an instance of B making use of the new type couldn’t be representable by A. On the other hand, B can make use of fewer types than A for existing fields, because A’s view is then of the same data with a little loss in precision in terms of what that data might be typed as.

So `{Text name} &lt; {Text name, Text address}` - hide the address in an instance of the RHS and you have an instance of the LHS.

However, equally, `{(Text or Number) ident} &lt; {Text ident}` - an instance of the RHS is an instance of the LHS (it’s just that there’s a little bit of a loss in precision on the LHS) but an instance of the LHS isn’t necessarily an instance of the RHS because you can’t represent Number idents on the RHS.

**examples:**


```
Product { } < Product Name { }
Product {Text name} < Product {Text name, Text address}
Product {(Text or Number) ident} < Product {Number ident}
Product {(Text or Number or URL) ident} < Product {(Text or Number) ident}
```



#### Determining the Join of two Entity Types

Let an Entity type A be described by a set of names A<sub>N</sub> and a set of fields A<sub>F</sub>, with each field having a label and a type.

Given two types A and B, then join(A, B) is the type J with names J<sub>N</sub> = union(A<sub>N</sub>, B<sub>N</sub>). Determining J<sub>F</sub> is more complicated:



* for each label in union(labels(A<sub>F</sub>), labels(B<sub>F</sub>)):
    * if the label is only in A<sub>F</sub>, or only in B<sub>F</sub>, then the label and its accompanying type is in J<sub>F</sub>.
    * if the label is in both A<sub>F</sub> and B<sub>F</sub> then the label is in J<sub>F</sub> and its type is given by the **intersection** of the types in A<sub>F</sub> and B<sub>F </sub>for the label. If there is no intersection then the join fails.

**examples**:


```
join(Product {Text name}, Restaurant {Address location}) 
 -> Product Restaurant {Text name, Address location}
join(Product {Text name}, Thing {Text name})
 -> Product Thing {Text name}
join(Product {(Text or Number) uid}, Product {Number uid})
 -> Product {Number uid}
join(Product {Text uid}, Product {Number uid})
 -> fail
```



#### Determining the Meet of two Entity Types

Let an Entity type A be described by a set of names A<sub>N</sub> and a set of fields A<sub>F</sub>, with each field having a label and a type.

Given two types A and B, then meet(A, B) is the type M with names M<sub>N</sub> = intersection(A<sub>N</sub>, B<sub>N</sub>).

Determining M<sub>F</sub> is more complicated:



* for each label in intersection(labels(A<sub>F</sub>), labels(B<sub>F</sub>)):
    * the label is in M<sub>F</sub> and its type is given by the **union** of the types in A<sub>F</sub> and B<sub>F </sub>for the label.

**examples:**


```
meet(Product {Text name}, Restaurant {Address location})
 -> * {}
meet(Product {Text name}, Product {Number sku})
 -> Product {}
meet(Product {Text name}, Restaurant {Text name})
 -> * {Text name}
meet(Product {(Text or URL) name}, Product {(Text or Number) name}
 -> Product {Text or URL or Number) name}
```



### Slot Types

Slots are the fundamental unit of presentation in Arcs. Each Slot instance confers an ability to render data and have the rendering be presented to the user.

Slot types are parameterized by two values; a form factor, and a modality. Join and meet for slot types will always fail unless the provided types are identical.


### Interface Types

Interfaces are the fundamental unit of behavior in Arcs. An interface instance is a particle or a recipe that provides a set of inputs and outputs.

Interfaces conceptually track information about 4 concepts for each input or output field:



1. the type of data that is read or written
2. direction (is the data being read, written, or both?)
3. action (what happens to the data inside the interface implementation?)
4. optionality (must the field be connected for the interface to be considered valid?)

Interfaces additionally track a further property that relate fields to each other:



5. dependency (is existence of part of the interface conditional on other parts being connected?)

An interface type has a list of records, each representing a single input or output field. Each record is composed of:



* an optional name for the input or output
* the type of data that is read or written
* whether the data is readable (‘in’), writeable (‘out’) or both (‘inout’)
* whether the input or output is optional
* zero or more channel “actions”, dependent on data type and direction
    * ‘provide’ if the interface is generating new slots into the channel (‘out’ or ‘inout’ only)
    * ‘consume’ if the interface is consuming slots from the channel for rendering (‘in’ or ‘inout’ only)
    * ‘generate’ if the interface is writing new interfaces into the channel (‘out’ or ‘inout’ only)
    * ‘host’ if the interface is executing other interfaces that are read from the channel (‘in’ or ‘inout’ only)
    * ‘create’ if the interface is constructing new entities and adding them to the channel (‘out’ or ‘inout’ only)
    * ‘mutate’ if the interface will register mutation listeners on entities on the channel
    * ‘modify’ if the interface will change entities on the channel
* A list of tags that pertain to the channel

An interface also contains an optional boolean expression that describes the set of valid states for the optional fields. This expression is used to encode dependencies.

Finally, an interface may have an optional name, and any number of verbs (which are used as part of strategizing for finer-grained control over automatic matching of handles to particles).

TODO(shans): This doesn’t deal with tag derivation or copying, not sure if this is something we want or not?

**Example:**

Take the following particle:


```
particle Foo
  in? [Product] products #wishlist
  out? [Product] filteredProducts
  out? Stats {number count} productInfo
  consume aRenderSlot
  provide anotherRenderSlot
```


What interfaces are satisfied by this particle? A fairly restrictive interface would consist of the following fields:



* **name**: products, **type**: [Product], **direction**: ‘in’, **optional**: true, **actions**: [], **tags**: [‘#wishlist’]
* **name**: filteredProducts, **type**: [Product], **direction**: ‘out’, **optional**: true, **actions**: [], **tags**: []
* **name:** productInfo, **type:** Stats {number count}, **direction**: ‘out’, **optional**: true, **actions**: [‘create’], **tags**: []
* **name**: aRenderSlot, **type**: Slot, **direction**: ‘in’, **optional**: false, **actions**: [‘consume’], **tags**: []
* **name**: anotherRenderSlot, **type**: Slot, **direction**: ‘out’, **optional**: false, **actions**: [‘provide’], **tags**: []

Note that the ‘create’ action can be inferred on productInfo because there’s no inputs that provide a Stats object.


```


```


The following much less restrictive interface would also be satisfied by this particle:



* **name**: products, **type: **[Product], **direction**: ‘in’, **optional**: false, **actions**: [], **tags**: []
* **name**: aRenderSlot, **type: **Slot, **direction**: ‘in’, **optional**: false, **actions**: [‘consume’], **tags**: []
* **name**: anotherRenderSlot, **type: **Slot, **direction**: ‘out’, **optional**: false, **actions**: [‘provide’], **tags**: []

Interfaces are described in manifest files with both a standalone format and an inline format. The standalone format starts with the keyword ‘interface’, followed by a name (if present) and the list of verbs. Indented, on a new line, and one per line, the fields then follow. These are represented by their actions (space-separated), then their direction (which may be omitted where action infers direction), followed by a question mark if the field is optional, followed by the type of the field, then the name, then the tags. Note that the field type can be omitted if it is of type Slot, if the action is consume or provide, and if the direction is inferred.

Action implies direction in the following way:



* _consume_ and _host _imply in
* _provide_, _generate _and _create _imply out

In addition to the fields, interfaces may include one or more “require-that” statements, which specify dependencies among any optional fields. These statements consist of the “require-that” keyword followed by a boolean expression. These expressions can contain optional field names, parentheses and the following operators:



* boolean and (&&)
* boolean or (||)
* negation (!)
* implication (->)
* equality (=)

Support for additional boolean functions and possibly operators is TBD; however the intention is that we will choose a set of functions that improve readability of the statements.

If multiple require-that statements exist, they are boolean anded together to generate a global statement. It is a semantic error to make use of names of fields which have not been marked as optional.

**example:**

The following interface:


```
interface IFoo &verb1 &verb2
  create inout? [Product] productifier #tag1
  generate? Recipe result
  consume root
  provide? subslot #tag2 #tag3
  mutate in Review reviewifier #tag4
  require-that result -> productifier

```



* has name IFoo and verbs verb1, verb2.
* has the following fields:
    * **name**: productifier, **type**: [Product], **direction**: inout, **optional**: true, **actions**: [create], **tags**: [tag1]
    * **name**: result, **type**: Recipe, **direction**: out, **optional**: false, **actions**: [generate], **tags**: []
    * **name**: root, **type**: Slot, **direction**: in, **optional**: false, **actions**: [consume], **tags**: []
    * **name**: subslot, **type**: Slot, **direction**: out, **optional**: true, **actions**: [provide], **tags**: [tag2, tag3]
    * **name**: reviewifier, **type**: Review, **direction**: in, **optional**: false, **actions**: [mutate], **tags**: [tag4]
* is valid only if root and reviewifier are connected, and if productifier is connected whenever result is. subslot may be connected, this does not impact validity.

The inline format for interfaces is similar, however the fields are surrounded by braces and comma-separated.

**example:**

The above interface has the following inline format:


```
interface IFoo &verb1 &verb2 {create inout? [Product] productifier #tag1, generate? Recipe result, consume root, provide? subslot #tag2 #tag3, mutate in Review reviewifier #tag4, require-that result -> productifier}
```



#### Normalizing Interface dependencies

There are multiple different ways to represent the same interface - for example, multiple different formulations of require-that boolean statements can have the same effect.

To deal with this concept, interfaces can be normalized to a regular form, and the regular forms of interfaces can then be utilized to help compute partial orderings, joins and meets.

To normalize an interface:



1. convert all require-that statements into a single, compound statement
2. replace any functions with their operator expansion
3. convert expression to conjunctive normal form
4. remove optional signal from any always-true fields (fields that appear in a disjunction with only one non-negated term) and remove related disjunction from the expression
5. remove any always-false fields (fields that appear in a disjunction with only one negated term) and remove related disjunction from the expression


#### Partial Ordering between Interface Types

A field F<sub>A</sub> in an interface type is locally less than a field F<sub>B</sub> in an interface type if:



* F<sub>A</sub>.name == F<sub>B</sub>.name
* each component of F<sub>B</sub>.direction is in F<sub>A</sub>.direction
* if B.direction contains ‘in’, F<sub>A</sub>.type ≥ F<sub>B</sub>.type
* if B.direction contains ‘out’, F<sub>A</sub>.type ≤ F<sub>B</sub>.type
* if F<sub>B</sub>.optional is false, then F<sub>A</sub>.optional is false
* every action in F<sub>B</sub>.actions is also in F<sub>A</sub>.actions
* every tag in F<sub>B</sub>.tags is also in F<sub>A</sub>.tags

An interface type A is less than an interface type B if:



* All required fields in the normalized version of B match a field in the normalized version of A, such that A’s field is locally less than B’s field. Note that it’s OK for fields to exist in A but not in B, and it’s OK for optional fields in B to not be matched by fields in A.
* After substituting ‘true’ for optional fields in B that are required in A, and ‘false’ for optional fields in B that are missing in A, B’s normalized require-that expression is true whenever A’s normalized require-that expression is true (i.e. A -> B).

An intuition for this second clause is that every state that is valid for interface A is also valid for interface B.

**Examples:**

A good intuition for what it means for an interface to be less than another interface is that the smaller interface can be used to run any instances of the larger interface. Here are some specific examples



* local ordering of fields:

    ```
    interface I {out N {B b} field} < interface K {out N {A a, B b} field}
    ```



    _(field.a is written to the output but not available to anything consuming the data)_


    ```
    interface I {in N {A a, B b} field} < interface K {in N {B b} field}
    ```



    _(field a is provided to the interface but not used)_


    ```
    interface I {inout T field} < interface K {out T field}
    ```



    _(the interface is allowed to read from field but never does)_


    ```
    interface I {inout T field} < interface K {in T field}
    ```



    _(the interface is allowed to write to field but never does)_


    ```
    interface I {consume B b} < interface K {in B b}
    ```



    _(b has the right to consume but never uses it)_

* optional fields:

    ```
    interface I {out T field} < interface K {in? U field2, out T field}
    ```



    _(optional field2 will never be connected)_


    ```
    interface I {out T field} < interface K {out T field, out? U field2, in? V field3, require-that field3 -> field2}
    ```



    _(optional field2 and dependent field3 will never be connected)_


    ```
    interface I {out? T field} ≮  interface K {out T field}
    ```



    _(if I.field were not connected then that would not violate interface I, but it would violate interface K)_


    ```
    interface I {out T field} < interface K {out? T field}
    ```



    _(optional interfaces can be treated as required)_



#### Determining the Join of two Interface Types

The join of two fields with the same name is given by:



* the direction is the intersection of the directions of the two fields. If this intersection is empty, then there is no valid join of the two fields.
* if the joined direction contains ‘in’, then the type of the joined field is the meet of the types of the input fields. If the joined direction contains ‘out’, then the type of the joined field is the join of the types of the input fields. If the join or the meet don’t exist, or if the join is not equal to the meet (i.e. the input fields don’t have equivalent types) when both ‘in’ and ‘out’ are part of the joined direction, then there is no valid join of the two fields.
* if any of the input fields are optional, then the joined field is optional
* the actions are the intersection of the actions of the two fields.
* The tags are the intersection of the tags of the two fields.

The join, J, of interfaces A and B is derived as follows:



1. For each pair of fields in both A and B, if a join exists, add the join  to J.
2. Set the require-that clause of J to the disjunction of the require-that clauses of A and B.

TODO: Examples for join.


#### Determining the Meet of two Interface Types

The meet of two fields with the same name is given by:



* the direction is the union of the directions of the two fields.
* the type is a type variable, constrained to be larger than the meet of field types where the field has direction ‘out’ or ‘inout’; and less than the join of field types where the field has direction ‘in’ or ‘inout’. If this constraint is not satisfiable then there is no valid meet of the two fields.
* if all of the input fields are optional, then the joined field is optional
* the actions are the union of the actions of the two fields
* the tags are the union of the tags of the two fields.

The meet, J of interfaces A and B is derived as follows:



1. For each pair of fields in both A and B, if a meet exists, add the meet to J. If the meet doesn’t exist, then there is no meet of A and B.
2. For each field in A but not B, and each field in B but not A, add the field to J.
3. Set the require-that clause of J to the conjunction of the require-that clauses of A and B.

TODO: Examples for meet.


## Type Variables

Metaprogramming is a powerful language concept that allows developers to improve the re-use of their code. Examples of metaprogramming include templates in C++, generics in Java (and TypeScript), and macros in C.

The Arcs type system provides type variables for metaprogramming. Type variables are well known to users of functional languages like Haskell, but also share a lot of similarities with generics.


### Motivating Examples for Type Variables


#### Transformations

Consider a particle that can render a single Product entity. It would have an interface something like this:


```
interface
  in Product product
  consume Slot rendering
```


Now imagine that we have a list of Product entities. How do we adapt our particle to work over the list of entities?

The Arcs solution to this problem is a special kind of particle called a transformation. Transformations have interfaces like regular particles:


```
interface
  in [Product] products
  consume [Slot] renderings
```


In addition, though, Transformations can create “inner arcs” (internal arcs with all access to the outer world controlled by the transformation) and spin up recipes inside those arcs. Finally, Transformations can read (and write) behaviour that can be instantiated inside the inner arc via a handle connection with a special “host” action. This is what a transformation that can multiplex over a single Product renderer would look like:


```
interface
  in [Product] products
  consume [Slot] rendering
  host interface {in Product product, consume Slot rendering}
```


However, this transformation is very specific to Products. In order to make the behaviour of rendering multiplexing generic, we would turn to type variables:


```
interface
  in [~a] products
  consume [Slot] rendering
  host interface {in ~a product, consume Slot rendering}
```


Type variables are scoped to the particle they’re defined on, so all instances of the type variable ~a in this example have to resolve to the same concrete type.


#### Preserving Entity State

The Arcs type system is designed such that developers of particles can specify precisely what information is required for their particle to work. For example, a particle which filters people based on date of birth and income can describe its requirements as:


```
in Person {Date date_of_birth, Number income}
```


However, this presents a slight problem - our filter particle will want to output the entire person entity, not just the fields which are filtered on. Type variables provide a means for a particle to simultaneously describe that it only needs a subset of fields for processing, and that it wishes to maintain the entire entity on its output:


```
particle PersonFilter
  in ~a with Person {Date date_of_birth, Number income}
  out ~a
```



### Type Variable Scoping

Every type variable is scoped to the particle (or interface) on which it is defined. Within a scope, all type variable declarations with the same name refer to the same underlying variable; however this is not true across scopes.

**Example**:


```
interface First
  in ~a inThing
  out ~a outThing
  in ~b inNotThing

interface Second
  in ~a anotherThing
```


In this example, the inThing and outThing connections are constrained to have the same type; however, the type of anotherThing (in the second interface) is not constrained in the same way. the inNotThing connection may also have a different type to inThing because different type variables are used for the two connections.


### Type Checking in Brief

Recipes are type-checked by considering each handle in the recipe in turn, and ensuring that the collection of types reading and writing into the handle are satisfiable with regards to the handle type.

If some of these types are type variables, then constraints are collected into the type variables to reflect statements that must be true in order for the other types to be satisfiable.

Handles which are newly created don’t have a type on creation, so they are assigned a type variable which is initially unconstrained. The type checking process therefore collects constraints on these newly created handle types too.

Whenever a constraint is added to a type variable, the constraint automatically propagates to all other uses of that type variable. There are two situations to consider here:



1. other uses that have already been considered during type checking. In these cases, the constraints added by the check that has already completed represents the totality of constraints required for satisfiability with regards to that check. It is therefore sufficient to check that the new constraints don’t conflict with the existing constraints.
2. other uses that have not yet been considered. In these cases, adding a constraint will cause that constraint to be taken into account when the use is considered.

At any point, constraints generated while type-checking a handle may end up conflicting with each other or with pre-existing constraints. In these cases, type checking fails and as a consequence the recipe is judged as invalid.

Once type-checking is complete, the constrained type variables can be converted into resolved types. In principle, any type that satisfies the constraints may be chosen; currently we choose the most permissive type. It is likely that we will start viewing min-max constrained types as valid concrete types in the future; this will mean that a choice isn’t required (and that resolving a recipe doesn’t result in a loss of generality).

Type checking is further complicated by the presence of type functions. See the [relevant section below](#type-checking-with-type-functions) for more information on how this works.


### Constraint Details

Each type variable instance has 3 optional values that represent constraints:



* A largest view of the type (representing all the information that is available based on the meet of all writes)
* A smallest view of the type (representing the minimum subset of information that is required based on the join of all reads)
* A fixed resolution, which points to a type that represents the type variable value

If a resolution exists, the other constraints must not be present. The resolution, in addition to providing a final value, can be used to indicate that two type variables have the same type, or that one type variable is the same type as a function of another type variable.

The syntax “`~a with &lt;entity>`” (described in the [Preserving Entity State](#preserving-entity-state) example) is mapped to either a one-sided or two-sided constraint depending upon whether the relevant connection is in, out, or both.

TODO: expand on this


## Type Functions

Type functions are a general-purpose mechanism for creating types that are derived from other types. Type functions are found in a number of languages; for example, Haskell defines type functions as a first-class type primitive, while C++ convolves type function functionality and code specialization together as templates. Java and TypeScript both provide type functions in the form of generics.

Type functions are represented using standard JavaScript-style function syntax - that is, the name of the type function, followed by an open bracket, followed by a list of input types, followed by a close bracket.


### Collections

A collection of a type represents a set of objects of that type. For example, where a handle of type `Product {Text name}` contains a single Product, a handle of type `Collection(Product {Text name})` contains a set of Products.

Collections have syntactic sugar: `[Product {Text name}]` is equivalent to `Collection(Product {Text name})`.

Collection(A) &lt; Collection(B) whenever A &lt; B. Accordingly, finding the meet or join of two collections is performed by finding the meet or join of the two input types, then forming a collection with the answer:


```
meet(Collection(A), Collection(B)) = Collection(meet(A, B))
join(Collection(A), Collection(B)) = Collection(join(A, B))
```



### References

A reference of a type represents an immutable pointer to an object of that type (much like a C++ reference). References allow Entities to denote relationships with other Entities, without requiring direct inclusion.

References can be dereferenced; the underlying object is then available for reading (and depending on permissions, for writing).

References behave identically to collections with regards to partial ordering, as well as meet and join operations.


### Tuples

The tuple type function takes 2 or more types as arguments and provides a type whose instances are tuples, with an instance of each of the input types in order contained within the tuple. The _order_ of a tuple describes the number of input types provided to the tuple type function.

Tuples of different orders are not comparable; no partial ordering exists between them, and neither a meet nor a join can be formed. For tuples of the same order, Tuple(A<sub>1</sub>, B<sub>1</sub>, … N<sub>1</sub>) &lt; Tuple(A<sub>2</sub>, B<sub>2</sub>, … N<sub>2</sub>) whenever A<sub>1</sub> &lt; A<sub>2</sub>, B<sub>1</sub> &lt; B<sub>2</sub>, … N<sub>1</sub> &lt; N<sub>2</sub>. Furthermore, meet and join distribute across the tuple function:


```
meet(Tuple(A1, B1, … N1), Tuple(A2, B2, … N2)) = Tuple(meet(A1, A2), meet(B1, B2), … meet(N1, N2))
join(Tuple(A1, B1, … N1), Tuple(A2, B2, … N2)) = Tuple(join(A1, A2), join(B1, B2), … join(N1, N2))
```



### Type Checking with Type Functions

Type functions naturally fit into handle typing, as the meet and join operations are defined for them. There are some final rules to consider to complete the type checking story:



* Meets and joins can never be found between different fundamental types - for example, there’s no meet between an Entity type and an Interface type, or between a Collection type and a Tuple type. The relative fundamental types in this respect are: Entity, Interface, Slot, Collection, Reference, Tuple.
* A type variable can be resolved to a type function; however, this isn’t necessarily a complete resolution as the inputs to the type function may also be type variables.


#### A Worked Example

TODO


## Future Work

TODO


### Mapping Target Language Types to Arcs Types


### Switching to inline-only Entities


### CRDT Typing of Entity Fields


### Relations and Type Adapters
