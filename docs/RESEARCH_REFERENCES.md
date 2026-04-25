# Multi-Agent Architecture & Academic References

This document records the academic papers and industry best practices that informed the architecture of this POC. It serves as a pedagogical reference for why the pipeline is structured as a TDD-like, artifact-driven multi-agent feedback loop rather than a single monolithic coding agent.

## Core Architectural Roles

The POC divides software engineering into five distinct agent roles. This aligns with multi-agent workflows proven to increase pass rates on benchmarks like SWE-bench by decoupling reasoning steps and reducing context limits.

| POC Role | Responsibility | Academic / Industry Equivalent |
|----------|----------------|--------------------------------|
| **Planning Agent** | Reads issue, generates technical plan | Planner / Reasoner |
| **Test Generation Agent** | Generates acceptance tests (TDD gate) | Test Generation Agent |
| **Implementation Agent** | Writes code to pass the test plan | Coder / Editor |
| **Execution & Analysis Agent**| Runs tests in sandbox, parses errors | Execution & Analysis Agent |
| **Review & Optimization Agent**| LLM-as-a-judge, routes feedback | Verifier / Reviewer |

## Adopted Best Practices & Paper Sources

### 1. TDD-like Test-First Gate
**Practice**: The Implementation Agent is blocked until the Test Generation Agent produces a `test-plan.md`. The Implementation Agent reads the test plan as a strict constraint.

**Source**: *TDFlow: Agentic Workflows for Test Driven Development* (EACL 2026, arXiv:2510.23761)

**Rationale**: Framing repository-scale software engineering as a test-resolution task significantly reduces the hallucination rate of code generation. TDFlow demonstrated a 27.8% absolute improvement on SWE-bench Lite by forcing a decouple of test generation from patch proposing. The paper notes that when an agent is constrained to solve pre-written tests rather than generating arbitrary code, it approaches human-level test resolution (94.3% success on SWE-Bench Verified).

### 2. Execution Feedback Loop (Short-Circuiting)
**Practice**: The Execution & Analysis Agent categorizes failures (e.g., `implementation_failure`, `plan_ambiguity`) and can route tasks directly back to the Implementation or Planning agents without waiting for the heavier Reviewer agent.

**Source**: *The Rise of Agentic Testing: Multi-Agent Systems for Robust Software Quality Assurance* (arXiv:2601.02454, Jan 2026)

**Rationale**: A closed-loop system with a dedicated Execution Agent that feeds exact runtime errors back to the generation step reduces invalid tests by 60% and avoids the bottleneck of a single monolithic review step. It allows the system to autonomously improve code quality and expand coverage by self-healing.

### 3. Plan Reminder (Prompt Re-injection)
**Practice**: Every agent's system prompt begins with a `[Plan Reminder]` block containing the original request, the current plan, and their specific role/step constraints.

**Source**: *From Plan to Action: How Well Do Agents Follow the Plan?* (arXiv:2604.12147, Apr 2026)

**Rationale**: LLM agents suffer from "plan drift" over long horizons. Explicitly re-injecting the plan and role constraints at each sub-task mitigates plan violations and keeps specialized agents (like the Test Generation Agent) from accidentally writing implementation code or ignoring previous architectural decisions.

### 4. Best-of-K with Verifier Rerank (Phase 4.5 Optional)
**Practice**: Generating $K$ candidate implementations in parallel, running the test suite on all of them, and using a Verifier LLM to select the highest-scoring build before proceeding to final review.

**Source**: *Training Software Engineering Agents and Verifiers with SWE-Gym* (arXiv:2412.21139)

**Rationale**: Inference-time scaling (test-time compute) using an Outcome-Supervised Reward Model (ORM) or LLM-as-a-judge significantly boosts resolution rates (+11.4% on SWE-Bench Verified) when token budget is not a primary constraint. This separates the generation problem from the verification problem, allowing smaller/cheaper models to propose patches while a stronger model selects the best outcome.
