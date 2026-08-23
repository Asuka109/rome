# Rome: An OS for recursive agents

## Vision: environments that grow with people and teams

Human progress has never been a story of raw intelligence alone.

Each generation inherits tools, knowledge, processes, and institutions created by those who came before it. A scientist does not rediscover mathematics from first principles. An engineer does not rebuild every machine needed to manufacture a computer. A company does not reconstruct accounting, logistics, law, and communication from nothing.

People build tools on top of tools, encode lessons into systems, and turn yesterday’s discoveries into today’s starting point. This cumulative process allows people and institutions to accomplish things far beyond the ability of any individual mind.

Agents should be able to do the same.

## The missing scaling axis

Most progress in AI is described through model scaling.

We make models larger, train them on more data, give them more compute, and evaluate whether they perform better. In most benchmarks, the evaluation environment is held constant: the model receives the same tools, interfaces, information, and rules, and we measure how intelligently it behaves within them.

Fixed environments make benchmarks easier to compare, but they leave out a defining feature of real-world intelligence.

Humans improve their environments as well as their ability to work within them. We create instruments, software, organizations, procedures, and institutions that make future work easier. When our tools are inadequate, we invent better ones. When a process repeatedly fails, we redesign it. When knowledge becomes important, we preserve it so others can build on it.

Today’s agents are increasingly capable, but they still operate inside environments designed in advance by humans:

* Their tools are supplied to them.
* Their workflows are predefined.
* Their memory systems are predetermined.
* Their interfaces are built for broad categories of users.
* Their criteria for success are often fixed before the task begins.

The model may improve while the environment around it remains mostly static.

We believe the next frontier is **environment scaling**: enabling agents to construct, adapt, and improve the environments in which they work.

> **Models scale intelligence. Rome scales the environment that intelligence can use.**

## Beyond software built for the average user

Most software is designed for an average user because, historically, it was too expensive to build and maintain different software for every person or team.

Users therefore adapt themselves to abstractions chosen by software vendors. They learn each application’s interface, divide their work according to its objects and workflows, and manually transfer information between systems.

Agents have inherited much of the same structure.

Two people with different goals, histories, values, relationships, and ways of working are often given essentially the same agent environment: the same tools, the same memory architecture, and the same interface, with only a thin layer of personalization on top.

Even when an agent successfully completes a task, the work often leaves little durable improvement behind. An answer remains in a conversation. A useful workflow disappears into a trace. A correction affects the current response without becoming part of a reusable capability.

A memory system might retain that a founder dislikes broad discounts. A durable improvement would also create a reusable way to evaluate future campaigns against the company’s brand, inventory, margin, and customer-retention goals.

Durable improvements must be **composable**. Future capabilities depend on combining what earlier work produced. A useful tool built today should become part of a workflow tomorrow. That workflow should later become one component of a broader operating capability.

An agent should complete the work and leave the environment better prepared for what comes next.

## What Rome is

People first experience Rome as a worker to whom they can delegate outcomes.

A user should be able to begin with the result they need, without deciding in advance which application to build, which tools to connect, or which workflow to automate:

> “Help us understand why this product is underperforming.”

> “Prepare us for this launch.”

> “Find the highest-value opportunity in the business this week.”

> “Help me identify someone who could unblock this project.”

Rome takes responsibility for understanding the objective, gathering the relevant context, and determining what capabilities are required. While doing the work, it can build or improve the tools it needs.

Rome may create an app when a persistent human interface is useful. An app can contain data, views, skills, and actions:

* A **skill** captures reusable knowledge or a way of approaching a class of problems.
* An **action** represents a repeatable executable workflow.
* **Context** captures what Rome has learned about the person, team, project, or situation.
* An **app** gives people a persistent interface through which they can inspect, steer, and use an underlying capability.

The underlying capability is the fundamental unit of the environment; an app is its human interface.

Rome can discover and reuse the skills, actions, data, and context created for one app in future work.

Apps organize human interaction; capabilities organize agent action.

## Intelligent reuse

As an environment grows, Rome manages the growing library of apps, prompts, tools, and workflows on the user’s behalf.

When a new task arrives, Rome intelligently determines:

* Which capabilities from previous work are relevant
* Which parts can be reused directly
* Which need to be adapted
* Which can be combined
* Whether their assumptions and permissions still apply
* What genuinely new capability remains to be built

Instead of users asking:

> “Open the inventory app we created three weeks ago, run its inventory-aging action, combine it with the customer-churn skill from the campaign-planning app, and apply the pricing preference I explained in a previous conversation”

Rome can reuse the actions and skills on the user's behalf.

A capability developed for one problem becomes a building block for a different and more ambitious problem later.

## Work should pay twice

Rome must operate on two timescales.

Rome should satisfy the user’s immediate need quickly enough to earn trust and usage. It should also make durable improvements when the work reveals something with long-term value.

> **Work should pay twice: once in the result it produces today, and again in the capability it leaves behind for tomorrow.**

A minor task may warrant only a small contextual update. When work reveals reusable knowledge, a recurring workflow, an important judgement, or a missing tool, Rome should preserve and compose what it learned.

Evaluate each durable improvement by how much it expands what the environment can do next.

## What works today—and what comes next

Rome already supports creation, persistence, discovery, and composition.

Today, Rome can:

* Create apps in response to users’ tasks
* Give those apps persistent data, skills, and actions
* Represent repeated workflows as reusable actions
* Retain relevant learned context
* Intelligently discover capabilities created during previous work
* Combine multiple prior apps, skills, actions, and pieces of context to solve a new task

Rome uses these capabilities for **runtime composition**: it can recall where a useful capability came from, connect it to the current task, and modify or extend some existing capabilities when a new situation requires it.

The next step is **persistent capability formation**. When Rome successfully combines several capabilities to solve a problem, it should preserve that composition as a reusable building block.

From there, the environment can increasingly:

* Learn from human corrections and real-world outcomes
* Improve existing capabilities rather than repeatedly rebuilding them
* Recognize opportunities before the user explicitly asks
* Evaluate whether an adaptation actually worked
* Refactor duplicate or obsolete components
* Learn which actions require approval and which can happen autonomously
* Abstract proven local capabilities so others can inherit and specialize them

The direction is:

> **Create → discover → compose → adapt → preserve → evaluate → improve**

Today, Rome can create, discover, and compose. We are building toward environments that can improve recursively.

## A business that learns how to operate

Consider a direct-to-consumer fashion company.

On the first day, the founder might ask:

> “Find customers who have not purchased in the last six months and prepare a win-back campaign.”

Rome can connect to the relevant systems, identify customers, analyze their prior purchases, and prepare a campaign.

At first, the human still provides much of the operating context:

* Which customers should receive an offer
* Which inventory should be promoted
* What discount is acceptable
* How the brand should sound
* Which actions require approval
* How success should be measured

Over the following weeks, Rome works across more of the company’s environment. With permission, it observes:

* Orders, returns, and inventory
* Customer-support conversations
* Product reviews and return reasons
* Campaign and advertising performance
* Pricing and promotion history
* Product launches and merchandising decisions
* Supplier constraints and restocking timelines
* The founder’s corrections, approvals, and rejected recommendations
* The outcomes of previous experiments

Rome begins to understand which products bring in new customers, which drive repeat purchases, which inventory is seasonal, which customers are price-sensitive, and which kinds of promotions would damage the brand.

While completing this work, it may create:

* An inventory-aging action
* A customer-churn skill
* A campaign-planning app
* A method for estimating margin impact
* Context about the company’s brand and pricing judgement
* An approval workflow for consequential pricing changes

Later, Rome notices that a seasonal product is accumulating faster than expected.

A conventional dashboard might display the inventory problem. A marketing copilot might suggest sending a discount email.

Rome instead combines the inventory-aging action created during earlier work with the customer-churn skill, the company’s pricing history, its brand judgement, and its learned approval process.

It concludes that a broad markdown would clear inventory but could damage margin and brand positioning. Instead, it identifies a segment of lapsed customers whose previous purchases suggest that the product is relevant to them. It proposes a targeted bundle, estimates the likely effect on sell-through and margin, prepares a limited experiment, and identifies which stakeholder must approve the pricing change.

After the experiment, Rome incorporates the result into the environment.

The company now possesses a better way of recognizing and responding to similar problems. The next time, Rome begins with the context, tools, workflows, judgement, and approval boundaries it has already accumulated. This improvement came from the accumulated environment, even if the underlying model did not change.

The same pattern applies beyond commerce. An AI startup preparing a release might ask Rome whether a new agent version is ready for a broader rollout. Rome could combine evaluation results, customer feedback, traces, code changes, latency, and cost data using capabilities created during prior work. It would produce a release recommendation now and preserve a reusable release-readiness capability for future launches.

## From productivity to compounding agency

Automation can remove work, and productivity tools help people accomplish more with the resources they already have.

Rome aims for **compounding agency**: expanding the set of outcomes a person or team can realistically and reliably pursue with the knowledge, time, tools, relationships, and resources available to them.

At first, this means doing existing work with less effort. Then it means making better decisions, noticing opportunities earlier, and coordinating more complex work. Eventually, it lets individuals and small teams pursue goals that previously required a much larger institution, specialized staff, or years of manually assembled infrastructure.

Rome should be evaluated by both the time it saves and the new outcomes a person or team can pursue.

> **Every person and team should own an evolving environment shaped by their goals, values, and experience.**

## One model, many environments

As capable models become broadly available, access to raw model intelligence will become less differentiating.

Two companies may use models of similar quality. One may still be dramatically more capable because its environment has accumulated years of:

* Context
* Specialized capabilities
* Judgement
* Evaluations
* Adaptation history
* Governance
* Evidence from real-world outcomes

The accumulated environment can remain valuable even when the underlying model is replaced.

Rome should support locally optimized environments for different people and organizations.

People and organizations have different goals, values, tastes, histories, relationships, and risk tolerances. A luxury brand and a discount retailer should not converge toward the same pricing judgement. One person may value a small number of deep relationships; another may want to cultivate a broad professional network.

These differences make personalized environments valuable.

> **The model may be shared, but the environment it helps create should be uniquely yours.**

Personalization should affect what the environment notices, which capabilities it builds, how it evaluates tradeoffs, when it acts, and which goals it helps pursue.

Rome should let those differences shape the capabilities it builds and the tradeoffs it makes.

## Inherit and specialize

Personalized environments can inherit general capabilities and specialize them through their owners’ work.

A company may begin with a general capability for customer retention. Over time, its local version learns:

* The company’s definition of churn
* Its customer segments
* Its product economics
* Its brand and pricing philosophy
* Which interventions have worked
* What evidence it requires
* Which stakeholders must approve consequential actions

The shared capability gives the company a head start. The specialized environment becomes a source of differentiation.

Some local improvements may contain ideas useful to others. Rome should help separate the reusable method from private context, company-specific judgement, and proprietary data.

With the owner’s permission, the general abstraction can then be shared. Other environments can inherit it and specialize it further. Experience compounds privately; abstractions can compound collectively.

This creates a broader ecosystem loop:

> **Inherit → specialize → apply → evaluate → improve → abstract → share → inherit again**

Agents should participate in the same cumulative process through which human tools and institutions have advanced.

## Trust should compound too

Rome’s adoption should be based on earned trust.

Rome begins by completing a concrete task through a narrow window into the relevant environment. As it demonstrates competence and judgement, the user may allow it to observe more context, suggest more improvements, and take more responsibility.

The progression is:

> **Do this for me → learn how I want it done → build a better way to do it → recognize when it should be done → handle it within the authority you have earned**

Access, competence, and authority are different.

Rome may understand how to change a company’s pricing without having permission to do so. It may have access to personal conversations without permission to quote or disclose them elsewhere.

Over time, Rome should learn:

* Which actions it can take independently
* Which adaptations it can make and report afterward
* Which changes require explicit approval
* Who the relevant stakeholders are
* When prior authorization does not apply to a materially different situation

Rome should earn only the autonomy appropriate to the task, the available evidence, and the authority the user has granted.

Value should precede access, and evidence should precede autonomy.

Low-risk, reversible adaptations may be adopted quickly. Consequential changes should require stronger evidence, limited experimentation, and appropriate stakeholder approval.

Governance can evolve, but consequential rules should be harder to change than low-risk preferences.

## Invisible by default, inspectable on demand

Users should benefit from the complexity of their environment without being forced to manage it.

Most of the time, they should simply delegate an outcome.

Rome can discover and compose capabilities quietly in the background. When useful, it can explain which prior work it reused and why. When a decision is consequential, it should make its evidence, assumptions, tradeoffs, and approval requirements legible.

Users should be able to inspect:

* What capabilities exist
* What they have learned
* Which data and permissions they use
* Where they came from
* How they have changed
* Which other capabilities depend on them

They should be able to correct, steer, modify, or roll back the environment.

Rome should be invisible when helping, legible when explaining, and fully inspectable when the user needs control.

## Software becomes substrate

Rome can build on existing software systems.

Databases, payment rails, communication networks, marketplaces, and systems of record provide valuable standardization and infrastructure. Shopify may continue processing orders. Stripe may continue moving money. GitHub may continue storing code.

Users can delegate outcomes without organizing their work around each vendor’s fixed interface and workflow.

Existing software increasingly becomes:

* Infrastructure Rome can invoke
* A source or destination of data
* A network or protocol that benefits from standardization

Rome becomes the evolving capability layer above it.

People express outcomes. Rome assembles the relevant systems, context, capabilities, and interfaces around those outcomes.

The long-term transition is:

> **From software as fixed products that humans operate to software as an evolving environment that agents construct with humans.**

Rome changes the relationship between people and applications: people specify outcomes, and Rome adapts software around the work.

## Why now

Five shifts make environment scaling practical.

First, models can increasingly interpret ambiguous goals rather than only execute rigid instructions.

Second, models can write and modify software. They can begin creating tools, workflows, interfaces, and evaluations dynamically instead of relying entirely on environments designed in advance.

Third, agents can operate across external systems and participate in real feedback loops. They can observe human corrections, approvals, operational signals, and eventual outcomes.

Fourth, the cost of creating personalized software is falling. Software can increasingly be created and maintained around a particular person or team.

Finally, capable models are becoming broadly accessible. As raw model performance becomes less scarce, the environment surrounding the model becomes a more important source of differentiation.

Together, these changes enable a new loop:

> **Understand the goal → construct the needed capability → act in the world → observe the result → improve the environment**

A model can propose an improvement. An environment allows that improvement to be preserved, tested, governed, reused, and composed into something more capable.

## Open and user-owned by design

A person’s or company’s accumulated environment may become one of its most valuable assets, and it should belong to them.

Rome is open source, inspectable, steerable, and exportable. Users should be able to understand what has been learned, examine how capabilities work, change models or runtimes, and move their accumulated environment without losing years of institutional capability.

Rome should win by being the best system for growing an environment. Users must be able to leave without losing the context, knowledge, and capabilities they accumulated.

Rome’s durable advantage should come from:

* The ecosystem of abstracted capabilities
* The machinery that converts experience into durable improvements
* Intelligent discovery and composition
* Evaluation against real-world outcomes
* Governance and trust mechanisms
* Refactoring and maintenance of growing environments
* Open standards through which capabilities can evolve

Rome should make institutional knowledge executable, composable, and capable of evolving while leaving ownership with the user.

## Design constraints

* **Turn experience into capability.** Memory and completed tasks should feed reusable tools, skills, and workflows.
* **Start from outcomes.** Apps are interfaces Rome may build, rather than software solutions users must specify in advance.
* **Preserve local goals and values.** Shared capabilities should specialize around different people and organizations.
* **Serve human ends.** Rome may suggest goals, expose contradictions, and question outdated assumptions, while people and institutions retain authority over the ends it pursues.
* **Maintain the environment.** Rome should consolidate, evaluate, refactor, and retire memories, scripts, and workflows as the environment grows.
* **Earn autonomy.** Progress requires better judgement about when to act independently and when to involve another person.
* **Compete without lock-in.** The accumulated agency belongs to the user.

## An open technical agenda

Building environments that genuinely compound raises difficult problems:

* How should a system determine what a task has taught it?
* When should a lesson update context, modify a skill, create an action, or become a new higher-level capability?
* How should Rome discover and compose capabilities without creating fragile dependencies?
* How should successful runtime compositions become durable building blocks?
* How should improvements be evaluated when the real world is fuzzy, causal evidence is incomplete, and stakeholder goals conflict?
* How should autonomy be learned without silently expanding beyond legitimate authority?
* How should a growing environment remain coherent rather than accumulating duplication and debt?
* How can private experience produce useful shared abstractions without leaking private context or erasing local differences?

These questions sit at the center of Rome’s product, systems, and research agenda.

We are building Rome in the open so the direction can be shaped across companies, model providers, and communities. We want to work with founders, researchers, engineers, designers, and open-source contributors who want to solve these problems with us.