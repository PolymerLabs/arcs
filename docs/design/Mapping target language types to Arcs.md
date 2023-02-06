# Mapping target language types to Arcs types

_shans@, July 2019_

Outcome of a design discussion involving piotrs@, csilvestrini@, and jopra@.


## What’s the problem?



1. we would like the types inside Arcs to be per-particle specified restrictions of “ideal” parent types (infinite precision reals, or infinite range integers). In other words, we don’t want particle authors to choose uint8_t as their age output because they’re pretty sure people can’t get older than 255; we want them instead to choose a “sensible” maximum that isn’t tied to word size (or no maximum, if they feel that’s appropriate).
2. We don’t want types to be arbitrarily restricted by the available primitives - users shouldn’t be prevented from easily talking about numbers larger than 2^64 (or encumbered needlessly while doing so) because the current standard long integer size is a 64-bit word.
3. We don’t want BigInt style embeddings in target languages - it’s painful to try and do things like array access when the index is represented in a BigInt; but if that’s the only mapping for “integer” then that’s going to be common.
4. We _do_ want Particles implemented in different host languages to be able to talk to each other easily. However, the defaults for even our current languages are pretty badly incompatible. It’s natural to want an int64 type for languages like C, however this flat doesn’t exist in JS (and you’d need a BigInt instead). The default integer type for Kotlin is int32, and it can be a bit annoying to use even an int64 type; but how would you read a BigInt value from JS into Kotlin?
5. We _do_ want adding new host languages to be relatively easy - so, for example, adding a new host language can’t require a programmer to consider the matrix of types provided by all existing host languages.


## Where should we end up?

We will leverage the existing understanding of two-sided type specification (“this is what I need, that is what I make”) and combine it with [refinement types](https://docs.google.com/document/d/100Fh1OTPe-ijVXd2iyBgLQ4IGsuiZzd09ovn43VGGWA/edit#bookmark=id.bkulzq8x3ub8) to allow particles to specify their requirements exactly. Arcs will then automatically infer if two particles can communicate, and will be able to provide meaningful reasons why they can’t.

There are two levels to this that are worth describing. 


### Language-specific types

Firstly, a particle author may choose to express their inputs/outputs in terms of their host language. For this purpose, we’ll provide KotlinInt, KotlinLong, KotlinFloat, KotlinDouble, etc (or some subset). It’s then trivial for a particle author to express their manifest in terms of types they’re familiar with.

Under the hood, these types will be aliases for refinements of an ideal number - so KotlinInt, for example, will be Integer but range-restricted to (-2^31 + 1, .. 2^31). Arcs will be capable of reasoning about the relationship between two refined integers; for example, a CUInt8_T will always be able to be viewed as a KotlinInt, but a KotlinInt can’t be viewed as a CUInt8_T without either relaxed reads (filtering) or some other kind of adaptation.


### More meaningfully refined types

We should ensure that our error messages and fuzz outputs are designed in such a way as to nudge developers towards thinking about refining their inputs and outputs more appropriately. For example, we should encourage precise descriptions of ranges when known - rather than just KotlinInt, we’d like developers to use constructs like 0 &lt; Integer &lt; 150.

For developers, the carrot is that their particles are far more likely to work with particles written in other languages. We can’t in general seamlessly adapt between, say, a JavaScript BigInt and a Kotlin Long, but we can adapt a BigInt restricted to 0..2^63.

For us, meaningful refinement increases the likelihood that 2 compatible particles will be able to cooperate with each other.


## What should we do for the Dev Experience?

Because our deadlines are tight, we are unlikely to have implemented refinement types at the point we make the dev experience available. As an interim measure, we should choose a handful of the Kotlin-specific types (perhaps just KotlinInt and KotlinDouble), implement these along with hand-tuned rules for adapting to Number, and encourage developers to use them. We could also consider providing bindings that let the Number type be automatically read in Kotlin as a Double or an Int (with exceptions being raised if the value is incompatible).

This approach should extend fairly gracefully to the refinement version when we get to that point.


# Alternative

Problems:



1. Many languages are more ergonomic if one can assume a bounded type, e.g. int64, rather than unboundedly large integers.
2. However, those are a bit arbitrary, and so when expressing schemas, we’d ideally either not have to worry about it (use types without implied bounds or precision) or at least give reasonable bounds.
3. But when considering CRDT operations like increment, decrement (instead of just set and clear), we technically can’t support bounds (in particular we can’t support uint in something that supports decrement)
4. When setting a reasonable bound, there is the case where it’s really just signaling. E.g. if two particles dealing with ages of humans define their type as &lt;1000 and &lt;32768, they now seem incompatible, even though in practice values are never higher than 130 or so. But there is a reason neither developer set it to 130.. their code still works correctly with higher numbers, so they are putting the limit way higher, _more as sanity check than real hard requirement_.
5. Similarly, consider future support for units. We couldn’t convert an int64 _inch_ value to an int64 _cm_ value, as theoretically that conversion could be out of bounds. But it’s hard to conceive of a use case that actually deals with 9,223,372,036,854,775,807 inches.

Proposal:



1. Let particles define the desired behavior when casting from an arbitrarily high number to something like int64, e.g. erroring or more likely clipping. Use types that are generously over provisioned relative to the actual values the particle expects, so that these are strictly corner cases.
    1. Requiring >= 0 (i.e. uint) seems like the most likely case. And as likely if the value dips below 0 for a bit, a corresponding increment will come shortly after. Even if not, and e.g. a user arbitrarily set the age to -10, particles behaving as if the value was 0 is likely the most sensible thing anyway.
2. Eventually use these behaviors + optional _hints_ on order of magnitude as a signal for matching, almost like tags. E.g. a UI particle that outputs positive integers still outputs an Integer, but also says that it’ll force them to be >=0. It might even have +/- buttons attached and so hint that it tends to be good for smaller numbers, but not setting a hard limit. This is a great particle to match up with something requiring human ages, i.e. positive and O(0-100), while functionally just enforcing >= 0 and &lt; 9,223,372,036,854,775,808. So particles operating on the same order of magnitudes are better matches than those who don’t, but we’re not taking those guidelines and making them hard limits (which would instead encourage setting really high numbers)
3. This leaves strongly restricting dependent type for cases that really do not allow other values (e.g. month of the year), and a mismatch is indeed a type mismatch.

Note:



1. This is isomorphic to the first proposal if one assumes many adaptors that increase type compatibility again, e.g. if one were really to restrict age to &lt;200, one that takes larger numbers and either clips it to this range or throws an error in the truly unexpected case. This proposal infers these adaptors, assuming that
    1. in practice the types supported ranges are way higher than expected values
    2. throwing errors for invalid data (or falling back to some defined behavior for invalid data) is something particles have to support anyhow, so this isn’t a new problem. Anything that would want to reduce this would require much more sophisticated dependent types than “KotlinInt”.
2. If we default to *64, we can almost certainly just do this implicitly. I.e. each language might come with a default mapping from e.g. Integer to int64, even if it is different per language, and the default behavior is to clip. Enforcing >0 or so might at first be done in the code itself.