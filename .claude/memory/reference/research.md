# Research Foundation

**Last Updated:** 2026-01-04
**Summary:** Learning science research informing the Personal Adaptive Learning System design

## Sources

This system design is informed by four sources:
1. **Make It Stick** by Brown, Roediger, and McDaniel
2. **A Mind for Numbers** by Oakley
3. **Ultralearning** by Young
4. **Adaptive Learning Platform Blueprint** (technical reference)

## Core Findings

### Retrieval Practice
The most robust finding in learning science is that retrieval practice dramatically outperforms passive review. Testing yourself on material, even without feedback, strengthens memory more than rereading. The system implements this by generating practice items that require active recall rather than recognition.

### Spacing Effect
The spacing effect shows that distributed practice outperforms massed practice with an effect size around g = 0.74. Reviewing material at increasing intervals produces better long-term retention than cramming. The system implements this through the SM-2 spaced repetition algorithm.

### Interleaving
Interleaving different topics during practice builds discrimination skills and transfer ability better than blocked practice on one topic. The system supports this through technique bundles that enable interleaved sessions.

### Testing Effect + Spacing
The testing effect combines with spacing: testing yourself at spaced intervals is more effective than either alone. The system combines these by scheduling retrieval practice at spaced intervals.

### Desirable Difficulties
Desirable difficulties are challenges that slow initial learning but improve long-term retention. Free recall is harder than cued recall which is harder than recognition, but the difficulty is beneficial. The system offers multiple practice modes with different difficulty levels.

### Cognitive Load Theory
Cognitive Load Theory identifies three types of load:
- **Intrinsic load** from material complexity
- **Extraneous load** from poor presentation
- **Germane load** from productive learning effort

The system tracks proxies for cognitive load including difficulty ratings, response times, and hint usage to enable future load-aware adaptations.

### Zone of Proximal Development
The Zone of Proximal Development describes the range between what a learner can do independently and what they can do with assistance. Items should challenge learners within this zone. The system tracks hint usage and independence levels to estimate ZPD position.

### Elaboration
Elaboration—explaining material in your own words and connecting it to prior knowledge—creates additional retrieval routes and deepens understanding. The system supports elaboration through technique bundles that prompt for explanations.

### Metacognition
Metacognition (knowing what you know and don't know) is often poorly calibrated. People overestimate their knowledge after passive review. The system collects confidence ratings before attempts to measure calibration.

### Self-Experimentation
Self-experimentation treats learning technique selection as an empirical question rather than accepting general recommendations. What works on average may not work best for an individual. The system tracks which techniques were used with which content to enable personalized analysis.

## Feature Mapping by Source

### From Make It Stick
- **Retrieval practice** → Practice item system with active recall modes
- **Spaced practice** → SM-2 scheduling
- **Interleaving** → Technique bundles
- **Elaboration** → Explanation practice modes
- **Calibration tracking** → Confidence ratings

### From A Mind for Numbers
- **Focused vs diffuse mode** → Session duration recommendations (not explicitly enforced)
- **Chunking** → KC extraction breaking content into learnable units
- **Testing effect** → Foundation of entire practice system

### From Ultralearning
- **Directness** → Execution tasks for procedural_execution knowledge
- **Drill** → Struggling items tracking for focused practice
- **Retrieval** → Core mechanism
- **Feedback** → Immediate by default, delayed as bundle option
- **Experimentation** → Technique bundle tracking

### From Adaptive Learning Platform Blueprint
- **Bloom's cognitive levels** → Captured on knowledge components
- **ZPD estimation** → Hint tracking and independence levels
- **Cognitive Load Theory proxies** → Complexity and difficulty ratings
- **Q-matrix knowledge mapping** → KC structure
- **Mastery modeling** → EMA (simpler alternative to BKT)

## Cross-References

- Related decisions: `decisions/technology.md` (SM-2 choice)
- Related milestones: All milestones implement these principles
