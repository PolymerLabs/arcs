# Overview: What is Arcs?

Arcs is an [open source](https://github.com/PolymerLabs/arcs) framework initiated by Google for third-party developers to build **composable** **assistive experiences** on the web.

## Why?

### For users

Users who browse the web usually do so with a specific intent in mind. The intent is rarely to just "browse the web" but rather anchored in a more complex task involving browsing multiple sites over a period of time. We call these complex tasks user journeys. Example journeys could be "I'm looking for a present for my niece" or "I'm planning a dinner out with my friends sometime next week". Arcs introduces a new platform for developers to build and deliver experiences that can assist users on these complicated journeys.

For example, let's assume Amélie wants to have dinner with her friends in San Francisco next week. Today, she may use half-a-dozen apps along her journey for communication (e.g., Slack), finding an appropriate time (e.g., Google calendar and Doodle), picking a restaurant (e.g., OpenTable), getting there (e.g., Google maps and Lyft), and sharing her experience privately (e.g., Google Photos) and publicly (e.g., Instagram) with friends. This is a cumbersome user experience. Amélie doesn't want to have to deal with, or think about, all of these applications that typically don't collaborate well with each other.

Instead, Amélie wants to express her intent, i.e., planning a dinner out with friends next week, and have apps cooperate together to assist her on the journey. This is what Arcs aims to provide for users.


### For developers

Today, web and app developers alike struggle to stand out and get their apps or websites discovered and highly rated. That is particularly true for newcomers, hobbyists and small teams of developers that don't have large marketing and advertising budgets. Access to user data is another huge barrier to entry for upcoming developers who may be innovating faster than incumbents but are at a disadvantage due to a lack of access to historical user data.

We believe developers want a level playing field: an open ecosystem in which their app gets automatically discovered and used whenever it's the best app at solving a user's need and want frictionless access to user data to best assist them on their journey. This is precisely what Arcs aims to provide for developers.


## What?

Before going into details on how we achieve this vision we'll define what Arcs is and its basic components. In Arcs, a user journey, as the one described above, is represented by an Arc. The Arc is created when a potential user intent is identified by Arcs and keeps executing and providing assistance to the user until the user journey is over (and possibly even after that, e.g., the above described Arc may remind you of the fun time you had at the restaurant with your friends a year from now). More concretely, <span style="text-decoration:underline;">Arcs are **composed** of *recipes* describing **co-operating** **third-party ephemeral pieces of code** called *particles* that operate on user data within strong data privacy constraints</span>. The Arcs platform is **collaborative** meaning that recipes (compositions) improve over time, for example, by making better assistive suggestions as more users interact with Arcs (of course without sharing personal information).

Let's unpack the above definition further.

The fundamental building blocks of Arcs are particles. Particles in Arcs operate on user data made available by the Arcs runtime. A particle is a bit of code and UI acting on input data and producing UI and/or output data. Particles are ephemeral meaning their lifetime is restricted to an Arc and cannot have any side effects (such as callouts to remote systems) beyond the UI they generate and data they output. Any particle output data becomes user data that is reusable in the same Arc or may be shared across other Arcs.

Every particle running in an Arc is a part of a recipe. An Arc may contain one or more recipes describing the *data flow *between individual particles running in the Arc. A recipe describes how inputs, outputs and UI of individual particles are stitched together, i.e., composed, to provide a higher level assistive function. E.g., there may be a recipe that can display available tables in San Francisco restaurants based on your calendar availabilities and personal tastes (i.e., inputs). Another recipe may be able to book a Lyft given a location, restaurant and an arrival time. Multiple recipes are combined together into an Arc representing an assistive user journey.

An Arc reflects a complete journey from beginning to end. In the example above, the beginning would be the user’s desire to plan dinner, and the journey would be complete when the dinner is finished and Amélie and their friends are back home.

## How?

Developers write useful particles and recipes that users may want to use in their assistive user journeys and host them, for example, on GitHub. Note that particle and recipe authors may be different people. A developer may come up with a new recipe that is composed of many different particles that already exist out there.

An Arcs server-side component[^1] discovers and indexes all known particles and recipes and makes that index available to any Arcs instance.

The Arcs instance runs continuously on a user device listening to changes in context and user data. When changes occur, e.g., user location changes, a new Chrome tab opens, the Arcs runtime uses the global index to find and rank recipes that may be of assistance to the user given the current context. When Arcs believes it found a great recipe to assist the user on a journey Arcs prompts the user with the suggestion.

TODO: introduce these basic principles here: Code comes to data and runs in "privacy sandboxes". Gives developers the possibility to gain access to all of a user's data. Users stay in control of their own data.


## Example journey revisited

Now that the basic concepts are introduced, let's revisit Amélie's user journey above and see how it maps to Arcs.

In the example journey above, Arcs will recognize Amélie's intention (using basic NLP) and the participants from the ongoing Slack conversation (from the context) and search through the global index for recipes matching her intent. High-scoring matching recipes will be speculatively instantiated as new Arcs assuming appropriate particles for the recipe were found that match the available inputs, outputs and UI capability requirements.

Newly spawned Arcs that are successfully instantiated will prompt Amélie. E.g., "Would you like help to organize a dinner out for next week?". By clicking on one of the suggestions, Amélie accepts the Arc and causes the other speculative Arcs that were not chosen to be garbage collected.

The remaining Arc (composed of several dozen particles written by as many developers) will assist Amélie in finding an appropriate restaurant based on Amélie's calendar availabilities and food preferences. The Arc will be displayed to Amélie allowing her to refine the suggestion, book the restaurant and share the Arc with her friends.
