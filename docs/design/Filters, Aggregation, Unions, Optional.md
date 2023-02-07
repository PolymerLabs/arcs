# Filters, Aggregation, Unions, Optionality, and Refinement Types


## Introduction

We’ve talked about a number of different concepts for Arcs recently. This document unifies them into a simple framework and proposes a design/implementation strategy.


## The Concepts


### Filters

We want to be able to express “all events that happened in the last 5 minutes”, or “all of the products in this list that have an SKU” as inputs to a particle; in other words, we want to be able to _narrow_ data from a source handle into a target connection.


### Aggregation

We want to be able to aggregate disparate data into a single handle. There are use-cases where different e.g. ingestion task outputs should be aggregated into a single place.

Aggregation and filtering are clearly closely related concepts.


### Unions

We make use of unions in two ways:



1. to describe fields within entities that can have potentially multiple types: \
(Text or URL) description;
2. to describe a type that consists of a union of different entities:

    Product {Text name} | Product {Text SKU}



### Optionality

Fields within entities may be optional. We may choose to extend the notion of dependence of optionality (currently specced but not implemented for interfaces) to entities as well.

Optionality and unions are closely related; both widen the universe of potential instances representable by a given type, but at the expense of specificity; in programmer terms, this loss of specificity translates to additional uncertainty about the usefulness of data (and a need to filter the data to ensure relevance).


### Refinement Types

Refinement types are types that restrict their universe of potential instances by use of a predicate (see [https://en.wikipedia.org/wiki/Refinement_type](https://en.wikipedia.org/wiki/Refinement_type) for a simple explanation). There’s an obvious and strong correspondence between moving from optional or union types to simple types, and moving from simple types to refined types; both improve the developer experience in the same way.


## The Proposal


### Introduce Refinement Types everywhere

We should:

provide a simple syntax for at least some subsets of refinement types, and ensure that this is widely supported by the type system. Concretely, this will allow handles and handle connections to take on refinement types in addition to simple types; type checking then requires determining if a superset predicate implies a subset predicate.

While fully expressive refinement types may be difficult in this regard, refinements expressed as range restrictions are trivial and we should be able to implement these end-to-end with approximately 4 weeks of effort. I suspect there’s also a week or so required for hacking this into the existing type system document.

Note that we don’t need to do this until we care about expressing the “all events from the last 5 minutes” use case.


### Implement “relaxed” arrows

Currently, type inference for handles finds the meet of all write types, the join of all read types, and succeeds if these both exist and the join is less than the meet, with an inferred type between the join and meet.

A relaxed arrow would opt into different behavior for inference. Relaxed arrows (which could, for example, be expressed as “`~>`” instead of “`->`”) would be available to recipe authors, and would not impact the direct execution semantics of connected particles.

In the presence of relaxed arrows, type inference would proceed as follows:



1. find the union-meet of all relaxed writes.
2. find the meet of this join with all strict writes.
3. find the union-meet of all relaxed reads.
4. find the join of this meet with all strict reads.
5. If both results exist and the meet from step (2) is larger than the join from step (4), then type checking succeeds as per normal.

Note that union-meet is an alternative definition of meet. I still need to work through what this is formally but it’s worth noting that it is a valid meet operation.

Concretely, relaxed writes can be thought of as aggregation, and relaxed reads as filtering. An intuitive way of thinking about the difference between relaxed and restricted reads and writes is:



* relaxed writes must be readable by *an* output
* restricted writes must be readable by *all* outputs
* relaxed reads must be capable of reading from *an* input
* restricted reads must be capable of reading *all* inputs

**Simple examples:**

Let’s say we have two writers writing the following types: Product {Text name, Text description} and Restaurant {Text name}.

If both were standard writes, then the meet of these two is * {Text name}. However, with relaxed writes, the union-meet is “Product {Text name, Text description} || Restaurant {Text name}” - in other words, fully described things that could come from either input.

If we have two readers reading the same types, then the standard join would be: “Product Restaurant {Text name, Text description}”. However, the union-meet is again  “Product {Text name, Text description} || Restaurant {Text name}”.

Mixing relaxed and restricted reads and writes is completely possible and may even be useful in some circumstances; I will require a little more time to work out the semantics of this.