# NBA Franchise Lab Methodology

This document records the Phase 2 engine formulas, assumptions, and intentional simplifications. The goal is not to pretend the public model is more precise than it is; the goal is to make every major transformation inspectable and replaceable.

## Core Value Layer

### BPM Baseline

The engine uses Box Plus/Minus (`BPM`) as the base player value signal.

Formula:

```text
weighted_box_plus_minus = box_plus_minus * minutes_share
```

Interpretation:
- `box_plus_minus` is a per-100-possessions estimate relative to league average.
- `minutes_share` is the share of one team's available minutes over the modeled period.
- This keeps player value additive at the team level.

Simplifications:
- The current engine trusts upstream BPM rather than re-estimating it.
- Possession-level fit and lineup interaction effects are not yet modeled.

### Age Curves

Age curves are empirical year-over-year BPM deltas grouped by `position_group`, `archetype`, and starting age.

Pipeline:
1. Filter to seasons with at least `1000` minutes.
2. Pair consecutive seasons for the same player.
3. Compute `next_season_bpm - current_season_bpm`.
4. Aggregate the mean and standard deviation of those deltas by age bucket.

Outputs:
- `expected_bpm_delta`
- `std_dev`
- `sample_size`

Simplifications:
- The current implementation is a bucketed empirical average, not a smoothed curve fit.
- Role labels and position groups are caller-supplied rather than inferred.

### Injury Risk

Injury risk is a recency-weighted availability heuristic based on games played.

Formula:

```text
availability_ratio = games_played / games_available
weighted_availability = weighted_mean(recent availability ratios)
injury_risk_score = 1 - weighted_availability
projected_games_played = weighted_availability * projected_games_available
```

Notes:
- Newer seasons receive larger weights than older seasons.
- Volatility is reported separately as the population standard deviation of recent availability ratios.

Simplifications:
- This is not an injury-event model.
- Severity, body-part recurrence, and aging interaction are not yet encoded.

### Player Projection

Projected player value composes the BPM baseline, the age delta, and an injury penalty.

Formula:

```text
projected_bpm = current_bpm + age_adjustment - injury_penalty_scale * injury_risk_score
projected_minutes_share = baseline_minutes_share * weighted_availability
projected_weighted_bpm = projected_bpm * projected_minutes_share
```

Simplifications:
- Injury effects are represented as a scalar penalty, not role- or archetype-specific degradation.
- Minutes redistribution across teammates is not modeled yet.

## Team and Game Layer

### Team Strength

Projected team strength is the sum of weighted projected player BPM terms.

Formula:

```text
player_contribution_sum = Σ(projected_weighted_bpm)
neutral_court_net_rating = league_average_net_rating + player_contribution_sum
home_court_net_rating = neutral_court_net_rating + home_court_adjustment
```

Default:
- `home_court_adjustment = +3.0` net-rating points

Simplifications:
- Rotation fit, scheme interaction, and substitution effects are not yet modeled.
- The current layer assumes player contributions are additive.

### Single-Game Win Probability

Net rating is converted to expected win rate using the approximation in the project plan:

```text
win_pct = (net_rating * 2.7 + 41) / 82
```

The output is clipped to `[0, 1]`.

Game win probability uses the log5 formula:

```text
P(A beats B) = (A - A*B) / (A + B - 2*A*B)
```

where `A` and `B` are the teams' expected win percentages.

Simplifications:
- Neutral-site games use both teams' neutral net ratings.
- Non-neutral games use the home team's `home_court_net_rating` and the road team's neutral rating.

### Monte Carlo Season Simulation

The season simulator takes an explicit schedule and repeatedly samples Bernoulli outcomes from each game's home win probability.

Process:
1. Compute one win probability per scheduled game.
2. Draw Bernoulli wins for `N` iterations.
3. Aggregate team win totals per iteration.
4. Rank each conference by wins, using team ID as the deterministic tie-breaker.
5. Record win means, win standard deviations, playoff qualification rates, and seed distributions.

Simplifications:
- The schedule must be supplied explicitly.
- Tiebreakers are deterministic and simplified.
- Play-in rules are not modeled yet; playoff qualification is a top-`K` conference finish.

### Playoff Simulation

Best-of-`N` series are simulated game by game using a fixed home/road pattern.

Patterns currently supported:
- best-of-1
- best-of-3
- best-of-5
- best-of-7

For best-of-7, the higher seed hosts games in a `2-2-1-1-1` pattern.

Bracket process:
1. Build a seeded bracket per conference.
2. Simulate each conference round.
3. Advance conference champions to the Finals.
4. Assign Finals home court to the stronger projected neutral-court team, then better seed, then lower team ID.

Simplifications:
- The Finals home-court approximation does not yet use actual regular-season record.
- The bracket is deterministic from seed order and does not yet model NBA play-in structure.

## Cap and Trade Layer

### CBA Rule Loading

The engine loads versioned YAML rule templates from:

- `data/cba/rules_2017.yaml`
- `data/cba/rules_2023.yaml`

Season selection:
- `2017-18` through `2022-23` use the 2017 ruleset
- `2023-24` onward uses the 2023 ruleset

The loader normalizes:
- roster limits
- trade-matching brackets
- first- and second-apron restrictions
- structural exception flags

Season-specific money thresholds are merged in separately.

Simplifications:
- Some season-specific exception amounts remain caller-supplied overrides because they are not yet encoded in repo-tracked structured data.

### Trade Salary Matching

The validator evaluates each team independently against the active CBA rule bucket.

Core formula:

```text
maximum_incoming_salary = outgoing_salary * multiplier + addend
```

Additional rule handling:
- first-apron or taxpaying restrictions
- second-apron aggregation bans
- second-apron cash restrictions
- regular-season roster-size limit

Simplifications:
- The current validator focuses on salary matching and roster count.
- Sign-and-trade, BYC, hard-cap sequencing, and exception consumption are not fully modeled yet.

### Cap Projection

The cap projector is a season-by-season arithmetic model:

```text
committed_salary = Σ(contract salary in season)
cap_holds = Σ(explicit cap holds in season)
total_team_salary = committed_salary + cap_holds
room_below_threshold = threshold - total_team_salary
```

Outputs include:
- cap room
- tax room
- first-apron room
- second-apron room
- expiring salary
- active standard-contract count

Simplifications:
- Cap holds are explicit inputs, not yet inferred from Bird-rights state.
- Option decisions are represented through the supplied contract timeline rather than decision trees.

### Cap Exceptions

Exception logic is currently a rule-based availability pass:
- `room_mid_level`
- `non_taxpayer_mid_level`
- `taxpayer_mid_level`
- `bi_annual_exception`
- `veteran_minimum`

High-level logic:
- teams with positive cap room surface the room exception path
- teams below the first apron retain the larger non-taxpayer path
- teams between the first and second aprons fall to the taxpayer path
- teams at or above the second apron lose that taxpayer path
- veteran minimum deals remain available

Simplifications:
- Exception amounts are optional overrides at evaluation time.
- Hard-cap future-sequencing effects are not yet chained across scenarios.

## Decision-Intelligence Layer

### Trade Evaluation

Trade evaluation compares pre- and post-trade:
- team net rating
- expected wins
- playoff probability
- championship probability
- current-season cap room and tax room

The evaluator currently assumes precomputed pre/post team strength, season simulation, playoff simulation, and cap-sheet results.

### Free-Agent Signing Evaluation

Signing evaluation compares pre/post:
- team net rating
- expected wins
- playoff probability
- cap room

It also reports whether the requested exception path is available.

### Injury Evaluation

Injury evaluation compares baseline and injury-adjusted:
- team net rating
- expected wins
- playoff probability
- championship probability

### Lineup Evaluation

Lineup evaluation compares baseline and adjusted:
- team net rating
- expected wins
- playoff probability

### Comparable Trade Search

Comparable trade search is a structured similarity score over:
- outgoing salary
- incoming salary
- average age
- average BPM
- pick count
- number of teams involved

Current scoring:

```text
similarity = 1 - average(normalized feature penalties)
```

Simplifications:
- The candidate trades must already be structured.
- Paragraph-level transaction history is not yet auto-transformed into fully structured historical trade packages.

## Validation and Calibration

### Backtesting

Completed-season backtesting currently reports:
- mean absolute win error
- root mean square win error
- playoff Brier score
- championship Brier score

Per-team formulas:

```text
win_error = actual_wins - projected_wins
absolute_win_error = |win_error|
playoff_brier = (actual_playoff - projected_playoff_probability)^2
championship_brier = (actual_champion - projected_championship_probability)^2
```

### Calibration

Calibration recommendations currently derive:
- `wins_bias_correction`
- `playoff_probability_scale`
- `championship_probability_scale`

Interpretation:
- positive `wins_bias_correction` means the model under-projected wins on average
- probability scales above `1.0` mean the model was too conservative
- scales below `1.0` mean the model was too aggressive

Simplifications:
- Calibration is currently a simple residual-based recommendation layer, not a refit of upstream coefficients.

## Known Phase 2 Boundaries

The engine now covers the full Phase 2 task list, but several boundaries are intentional:
- historical BPM is still not materialized as a first-class warehouse adapter input
- playoff qualification still uses simplified top-`K` seeding rather than NBA play-in logic
- cap exception amounts are not yet fully encoded season by season in tracked structured config
- trade comparables require structured candidates instead of raw paragraph transaction entries
- calibration recommends corrections but does not automatically rewrite the model coefficients
