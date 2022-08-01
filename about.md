---
layout: page
title: About
permalink: /about
---

## Origin

The [FTK Research Institute for Telecommunication and Cooperation e.V.](https://ftk.de) and Prof. Dr.  Dominic Heutelbeck lead the development of the SAPL Project. It has its origins in European research projects.

The [Smart Vortex](https://smartvortex.eu/) was a project funded by the Seventh Framework Programme (FP7) of the European Commission. 
This project between European industry and research institutions developed tools and services supporting collaboration between 
cross-organizational and geographically distributed teams of engineers in supporting service-oriented business models in delivering 
hardware and software. 
These business models require sharing and real-time analysis of life data streams between customer sites, maintenance crews, remote 
experts, and service providers.
The experts use the data for decision-making, problem-solving, and providing maintenance services both in synchronous and asynchronous 
collaborative scenarios.
As the users belong to different organizations, the real-time data and attached process data have different levels of 
confidentiality assigned to it, and policies for access are dependent on contracts, NDAs, and intellectual property protection 
strategies of the individual organizations, simple access control mechanisms like RBAC were not sufficient to implement the desired 
collaborative cross-organizational tools.
The project adopted the attribute-based access control (ABAC) pattern using XACML as its primary access control mechanism.
The project also adopted semantic-web technologies to model the collaboration scenarios' organizational structures. 
The implementation of XACML Policy Information Points using dynamic semantic-web ontologies quickly highlighted some expressive 
limitations of existing XACML solutions, resulting in the need for specific tools and methods to author matching XACML policies. 
These resulting policies were both technically inefficient and unreadable by humans. 
At the same time, the highly dynamic collaborative nature of the developed tools and the streaming nature of the IoT 
data forced the applications to constantly poll the Policy Decision Points (PDPs) to fulfill the basic security requirements of the services. The complex polling and policies resulted in high system loads and limited the responsiveness of the applications.

Overall, the developers in Smart Vortex were frustrated with the technical limitations and availability of XACML tooling and initiated the Streaming Attribute Policy Language (SAPL) Engine project as a passion project with the goals to:
* support traditional ABAC use-cases,
* enable continuous policy enforcement in session-based collaborative applications and for IoT streaming data,
* provide a more human-readable syntax,
* extend the expressiveness of ABAC policy languages to include parametrized streaming attribute access via PIPs,
* use a JSON-based data model,
* provide maximal ease of use of the tools and services from a developer's perspective,
* provide well-tested clean tools not only server-side (PDP) but also for developing Policy Enforcement Points (PEPs) on the client side with seamless integration into existing frameworks.

The first real-world use case to validate the SAPL Engine is the [Our Puppet](https://www.ourpuppet.de/) project (funded by the German Federal Ministry of Education and Research (BMBF)). I to implement a prototypical privacy-by-design infrastructure integrating robotic AI-driven assistants into the day-to-day care for dementia patients primarily supporting informal caregivers, such as their worries and uncertainties about the well-being of their loved ones can be relieved.
Here, a focus was the anonymization of personal data for different use-cases.

Currently, the [VPP4ISLANDS](https://vpp4islands.eu) project uses the SAPL Engine. The project is funded by the European Union's Horizon 2020 
research and innovation programme under grant agreement No 957852. The scope of this project is to create a platform for 
virtual power plants on European islands. It will collect data and information from real-time measurements of the physical 
systems (e.g., generation output, demand, voltage, and current of the network), information on the surrounding environment 
(e.g., price signals, weather info), and VPP Shadow; process such data and information using advanced software tools, e.g.,
machine learning to provide an accurate and coherent data and information set for facilitating better decision making 
of the participants. 

SAPL plays an essential role in VPP4ISLAND's data transparency and privacy strategy. 
SAPL is used to protect the different APIs of the VPP4ISLANDS platform. Further, SAPL is used to create a hybrid authorization 
environment, integrating traditional business applications with smart contracts residing on the blockchain, using the smart contracts 
state as streaming attribute sources for authorization decision making.

## Development

Based on the experiences in the Smart Vortex project, Prof. Dr. Dominic Heutelbeck initiated the development of SAPL as a side activity together with FTK staff and computer science students of the [Universsity of Hagen](https://www.fernuni-hagen.de/english/) in practical group courses and thesis work. 

The SAPL development process enforces openness, usability, correctness, clean code, rigorous testing, and static 
code-analysis for the core components of the engine. 
The goal is to make ABAC easy to use for developers by providing essential tools 
as free Open Source under the Apache 2.0 Licence with the option to provide additional professional support and commercial extensions for 
adoption at scale or with specific needs.
