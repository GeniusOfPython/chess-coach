# Weak themes and spaced repetition

The training layer keeps reviewed mistakes locally and turns them into a small
daily repetition queue. The feature does not send FEN, moves, or results to an
external service.

## Scheduling

- A new reviewed mistake is due immediately until it is practised.
- An independent correct solution advances through 1, 3, 7, 14, and 30 days.
- A failed or hinted solution returns to the one-day interval.
- A daily session contains at most five due positions.
- The queue is capped at 120 positions and preserves existing item identity.

## Weak theme

The primary tactical motif of the best move supplies the theme. When no
verified motif is detected, the task uses the calculation theme. The weakest
theme is selected from mistake severity, failed attempts, and lapses. This is a
local training signal, not a claim about the player's general chess strength.

## Persistence boundary

The React hook owns current UI state. The repository owns serialization and
validation. The analysis module owns scheduling and theme classification. This
keeps the future cloud adapter outside chess and training logic.
