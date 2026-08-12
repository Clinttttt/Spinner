import type { OperationsCounts } from "../../operations/operationsCountsStore";

/**
 * What the assistant card says.
 *
 * A headline and exactly three short facts, which is what the speech panel has room for.
 * The card used to read "Hi, I'm Spinly / I'm here to help you keep things running smoothly
 * today" on every load, which told the owner nothing they could act on while taking the most
 * prominent space on the screen to do it.
 */
export interface SpinlySummary {
  title: string;
  lines: [string, string, string];
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
 * Money, short enough for the card.
 *
 * Rounded to whole pesos on purpose: each fact gets one short line, and "₱2,450.00 sales"
 * wraps where "₱2,450 sales" does not. The exact figure is a tap away in Insights.
 */
function peso(amount: number) {
  return `₱${Math.round(amount).toLocaleString("en-PH")}`;
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
      lines: ["No active orders", "No pickups due", "Start a new order"],
    };
  }

  // Work has happened, and none of it is still outstanding.
  if (active === 0) {
    return {
      title: "All caught up",
      lines: fill([
        "No pending pickups",
        handledToday > 0 ? `${handledToday} completed` : null,
        takings > 0 ? `${peso(takings)} sales` : null,
        ...absences(counts),
      ]),
    };
  }

  if (active >= BUSY_ACTIVE_ORDERS) {
    return {
      title: "Busy day ahead",
      lines: fill([
        `${active} active orders`,
        counts.forPickup > 0
          ? `${counts.forPickup} ${plural(counts.forPickup, "pickup", "pickups")} left`
          : null,
        counts.readyForDelivery > 0 ? `${counts.readyForDelivery} ready` : null,
        counts.beingProcessed > 0
          ? `${counts.beingProcessed} processing`
          : null,
        counts.newBookings > 0 ? `${counts.newBookings} to confirm` : null,
        ...absences(counts),
      ]),
    };
  }

  // Late in the day, what matters is how much of it got done.
  if (hour >= EVENING_STARTS_AT_HOUR && handledToday > 0) {
    return {
      title: "Today's progress",
      lines: fill([
        `${handledToday} of ${handledToday + active} completed`,
        `${active} still active`,
        takings > 0 ? `${peso(takings)} collected` : null,
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
          ? `${counts.forPickup} ${plural(counts.forPickup, "pickup", "pickups")}`
          : null,
        counts.readyForDelivery > 0
          ? `${counts.readyForDelivery} ${plural(counts.readyForDelivery, "delivery", "deliveries")}`
          : null,
        counts.newBookings > 0 ? `${counts.newBookings} to confirm` : null,
        counts.beingProcessed > 0
          ? `${counts.beingProcessed} processing`
          : null,
        takings > 0 ? `${peso(takings)} so far` : null,
        ...absences(counts),
      ]),
    };
  }

  return {
    title: `${active} ${plural(active, "order", "orders")} today`,
    lines: fill([
      counts.readyForDelivery > 0 ? `${counts.readyForDelivery} ready` : null,
      counts.beingProcessed > 0 ? `${counts.beingProcessed} processing` : null,
      takings > 0 ? `${peso(takings)} sales` : null,
      counts.forPickup > 0
        ? `${counts.forPickup} ${plural(counts.forPickup, "pickup", "pickups")} left`
        : null,
      counts.newBookings > 0 ? `${counts.newBookings} to confirm` : null,
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
function fill(candidates: (string | null)[]): [string, string, string] {
  const chosen = candidates.filter((line): line is string => line !== null);

  return [chosen[0] ?? "", chosen[1] ?? "", chosen[2] ?? ""];
}

/**
 * The honest things left to say when there is not much on.
 *
 * Each is true only when its count is zero, so appending these to a branch's own facts can
 * never contradict them. Ordered by what the owner would look for next.
 */
function absences(counts: OperationsCounts): (string | null)[] {
  return [
    counts.forPickup === 0 ? "No pickups due" : null,
    counts.readyForDelivery === 0 ? "Nothing ready yet" : null,
    counts.newBookings === 0 ? "Nothing to confirm" : null,
    counts.salesToday === 0 ? "No sales yet" : null,
  ];
}
