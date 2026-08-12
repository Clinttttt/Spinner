import type { OperationsCounts } from "../../operations/operationsCountsStore";

/**
 * One line under the headline.
 *
 * Money is its own shape rather than a formatted string, because the amount is set in navy
 * and bold while the word beside it stays quiet. Keeping them apart means the card decides
 * how they look and this file only decides what they say.
 */
export type SpinlyLine =
  | { kind: "fact"; text: string }
  | { kind: "money"; amount: string; label: string };

/**
 * What the assistant card says.
 *
 * A headline and up to three short facts, which is what the speech panel has room for.
 * The card used to read "Hi, I'm Spinly / I'm here to help you keep things running smoothly
 * today" on every load, which told the owner nothing they could act on while taking the most
 * prominent space on the screen to do it.
 */
export interface SpinlySummary {
  title: string;
  lines: SpinlyLine[];
}

function fact(text: string): SpinlyLine {
  return { kind: "fact", text };
}

function money(amount: number, label: string): SpinlyLine {
  return { kind: "money", amount: peso(amount), label };
}

/**
 * Where "a lot on" starts.
 *
 * A single-branch laundromat with eight jobs open at once is having a busy day. The figure
 * sits here rather than inline so it can be raised in one place as the shop grows.
 */
const BUSY_ACTIVE_ORDERS = 8;

/** Before this hour the day is still being planned rather than reviewed. */
const MORNING_ENDS_AT_HOUR = 11;

/** From this hour the day is worth summing up. */
const EVENING_STARTS_AT_HOUR = 17;

/**
 * Money, written the way the shop's books write it.
 *
 * Two decimals, matching the receipts, the ledger and every other amount in the app. An
 * earlier version rounded to whole pesos to save width, which made this the one place a
 * figure appeared in a different form from everywhere else. "₱128,499.50 sales" still fits
 * the panel, so there was nothing to buy with the inconsistency.
 */
function peso(amount: number) {
  return `₱${amount.toLocaleString("en-PH", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  })}`;
}

function plural(count: number, singular: string, pluralForm: string) {
  return count === 1 ? singular : pluralForm;
}

/**
 * A summary of the shop's day, from the counts the dashboard already provides.
 *
 * Every line is derived from a real figure. Nothing is padded with encouragement, and no
 * figure appears that the shop has not actually got: a takings line only shows once money
 * has come in, a pickup line only when there are pickups. When there is genuinely nothing
 * on, the card says so plainly rather than inventing activity.
 *
 * @param now Passed in rather than read here, so the caller owns the clock. The phone's
 * local time is the shop's time.
 */
export function buildSpinlySummary(
  counts: OperationsCounts,
  now: Date,
): SpinlySummary {
  const active =
    counts.newBookings +
    counts.forPickup +
    counts.beingProcessed +
    counts.readyForDelivery;

  const hour = now.getHours();
  const handledToday = counts.completedToday;
  const takings = counts.salesToday;

  // Nothing open, nothing finished, nothing taken. Said plainly, with the one thing worth
  // doing next.
  if (active === 0 && handledToday === 0 && takings === 0) {
    return {
      title: "Ready for today",
      lines: [
        fact("No active orders"),
        fact("No pickups due"),
        fact("Start a new order"),
      ],
    };
  }

  // Work has happened, and none of it is still outstanding.
  if (active === 0) {
    return {
      title: "All caught up",
      lines: fill([
        fact("No pending pickups"),
        handledToday > 0 ? fact(`${handledToday} completed`) : null,
        takings > 0 ? money(takings, "sales") : null,
        ...absences(counts),
      ]),
    };
  }

  if (active >= BUSY_ACTIVE_ORDERS) {
    return {
      title: "Busy day ahead",
      lines: fill([
        fact(`${active} active orders`),
        counts.forPickup > 0
          ? fact(
              `${counts.forPickup} ${plural(counts.forPickup, "pickup", "pickups")} left`,
            )
          : null,
        counts.readyForDelivery > 0
          ? fact(`${counts.readyForDelivery} ready`)
          : null,
        counts.beingProcessed > 0
          ? fact(`${counts.beingProcessed} processing`)
          : null,
        counts.newBookings > 0
          ? fact(`${counts.newBookings} to confirm`)
          : null,
        ...absences(counts),
      ]),
    };
  }

  // Late in the day, what matters is how much of it got done.
  if (hour >= EVENING_STARTS_AT_HOUR && handledToday > 0) {
    return {
      title: "Today's progress",
      lines: fill([
        fact(`${handledToday} of ${handledToday + active} completed`),
        fact(`${active} still active`),
        takings > 0 ? money(takings, "collected") : null,
        ...absences(counts),
      ]),
    };
  }

  // Early on, the useful framing is what is coming rather than what is left.
  if (hour < MORNING_ENDS_AT_HOUR) {
    return {
      title: `${active} ${plural(active, "job", "jobs")} scheduled`,
      lines: fill([
        counts.forPickup > 0
          ? fact(
              `${counts.forPickup} ${plural(counts.forPickup, "pickup", "pickups")}`,
            )
          : null,
        counts.readyForDelivery > 0
          ? fact(
              `${counts.readyForDelivery} ${plural(counts.readyForDelivery, "delivery", "deliveries")}`,
            )
          : null,
        counts.newBookings > 0
          ? fact(`${counts.newBookings} to confirm`)
          : null,
        counts.beingProcessed > 0
          ? fact(`${counts.beingProcessed} processing`)
          : null,
        takings > 0 ? money(takings, "so far") : null,
        ...absences(counts),
      ]),
    };
  }

  return {
    title: `${active} ${plural(active, "order", "orders")} today`,
    lines: fill([
      counts.readyForDelivery > 0
        ? fact(`${counts.readyForDelivery} ready`)
        : null,
      counts.beingProcessed > 0
        ? fact(`${counts.beingProcessed} processing`)
        : null,
      takings > 0 ? money(takings, "sales") : null,
      counts.forPickup > 0
        ? fact(
            `${counts.forPickup} ${plural(counts.forPickup, "pickup", "pickups")} left`,
          )
        : null,
      counts.newBookings > 0 ? fact(`${counts.newBookings} to confirm`) : null,
      ...absences(counts),
    ]),
  };
}

/**
 * Takes the first three facts that apply.
 *
 * Candidates are listed in the order the owner most wants them, and anything that does not
 * apply is null and skipped, so a day with no deliveries does not get a "0 deliveries" line.
 *
 * There is deliberately no separate list of fallbacks. An earlier version had one, and it
 * could contradict a line it had already chosen: a shop with one order ready and good
 * takings was told "1 ready" and "Nothing ready yet" in the same breath. Every statement of
 * absence is now a candidate in its own right, guarded by the same count it describes, so
 * the two cannot both be true. A blank line is the last resort, never filler.
 */
function fill(candidates: (SpinlyLine | null)[]): SpinlyLine[] {
  return candidates
    .filter((line): line is SpinlyLine => line !== null)
    .slice(0, 3);
}

/**
 * The honest things left to say when there is not much on.
 *
 * Each is true only when its count is zero, so appending these to a branch's own facts can
 * never contradict them. Ordered by what the owner would look for next.
 */
function absences(counts: OperationsCounts): (SpinlyLine | null)[] {
  return [
    counts.forPickup === 0 ? fact("No pickups due") : null,
    counts.readyForDelivery === 0 ? fact("Nothing ready yet") : null,
    counts.newBookings === 0 ? fact("Nothing to confirm") : null,
    counts.salesToday === 0 ? fact("No sales yet") : null,
  ];
}
