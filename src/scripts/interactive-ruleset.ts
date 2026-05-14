import { groupBy, partition, zip } from "es-toolkit";
import { getRegistrableDomain } from "./registrable-domain.ts";
import { type LinkProps, Ruleset } from "./ruleset/ruleset.ts";

export type NamedRuleset = {
  name: string;
  ruleset: Ruleset;
};

export type Action =
  | { type: "block" }
  | { type: "unblock" }
  | { type: "highlight"; colorNumber: number };

export type ActionType = Action["type"];

export type Patch = {
  mode: PatchMode;
  props: LinkProps;
  rulesToAdd: string;
  lineNumbersToRemove: readonly number[];
  rulesToRemove: string;
  userActionNotToRemove: Action | null;
  subscriptionsAction: Action | null;
  matchingRules: MatchingRules | null;
};

export type PatchMode = ActionType | "unhighlight";

export type PatchOptions = {
  useRegistrableDomain?: boolean;
  collectMatchingRules?: boolean;
};

export type MatchingRules = Record<ActionType, string>;

export class InteractiveRuleset {
  constructor(user: NamedRuleset, subscriptions: readonly NamedRuleset[]) {
    this.#user = user;
    this.#subscriptions = subscriptions;
  }

  query(props: LinkProps): Action | null {
    return (
      resolveAction(match(this.#user, props)) ||
      resolveAction(
        this.#subscriptions.flatMap((ruleset) => match(ruleset, props)),
      )
    );
  }

  createPatch(
    mode: PatchMode | null,
    props: LinkProps,
    options: PatchOptions = {},
  ): Patch {
    const matches = match(this.#user, props);
    const subscriptionMatches = this.#subscriptions.map((ruleset) =>
      match(ruleset, props),
    );
    const subscriptionsAction = resolveAction(subscriptionMatches.flat());
    if (!mode) {
      const action = resolveAction(matches) || subscriptionsAction;
      if (action?.type === "block") {
        mode = "unblock";
      } else if (action?.type === "highlight") {
        mode = "unhighlight";
      } else {
        mode = "block";
      }
    }
    const [matchesNotToRemove, matchesToRemove] = partition(
      matches,
      ({ action }) => satisfiesMode(action, mode),
    );
    const userActionNotToRemove = resolveAction(matchesNotToRemove);
    const rulesToAdd = satisfiesMode(
      userActionNotToRemove ?? subscriptionsAction,
      mode,
    )
      ? ""
      : suggestMatchPattern(
          mode,
          props.url,
          options.useRegistrableDomain ?? false,
        );
    const matchingRules = options.collectMatchingRules
      ? collectMatchingRules([
          { rulesetName: this.#user.name, matches },
          ...zip(this.#subscriptions, subscriptionMatches).map(
            ([ruleset, matches]) => ({ rulesetName: ruleset.name, matches }),
          ),
        ])
      : null;
    return {
      mode,
      props,
      rulesToAdd,
      lineNumbersToRemove: matchesToRemove.map(({ lineNumber }) => lineNumber),
      rulesToRemove: matchesToRemove.map(({ rule }) => rule).join("\n"),
      userActionNotToRemove,
      subscriptionsAction,
      matchingRules,
    };
  }

  validateRulesToAdd(patch: Patch, rulesToAdd: string): boolean {
    const rulesetToAdd = new Ruleset("");
    rulesetToAdd.extend(rulesToAdd);
    const actionToAdd = resolveAction(
      match({ name: "Patch", ruleset: rulesetToAdd }, patch.props),
    );
    let action = patch.userActionNotToRemove;
    if (actionToAdd) {
      action = action ? dominantAction(action, actionToAdd) : actionToAdd;
    }
    action = action || patch.subscriptionsAction;
    return satisfiesMode(action, patch.mode);
  }

  applyPatch(patch: Patch, rulesToAdd?: string): string {
    const rules = [...this.#user.ruleset]
      .filter((_, index) => !patch.lineNumbersToRemove.includes(index + 1))
      .join("\n");
    const effectiveRulesToAdd = rulesToAdd ?? patch.rulesToAdd;
    return `${rules}${rules && effectiveRulesToAdd ? "\n" : ""}${effectiveRulesToAdd}`;
  }

  #user: NamedRuleset;
  #subscriptions: readonly NamedRuleset[];
}

type Match = {
  lineNumber: number;
  rule: string;
  action: Action;
};

function match(ruleset: NamedRuleset, props: LinkProps): Match[] {
  const { protocol, hostname, pathname, search } = new URL(props.url);
  const testRawResult = ruleset.ruleset.testRaw({
    ...props,
    scheme: protocol.slice(0, -1),
    host: hostname,
    path: `${pathname}${search}`,
  });
  const matches: Match[] = [];
  for (const { lineNumber, specifier } of testRawResult) {
    const action: Action = !specifier
      ? { type: "block" }
      : specifier.type === "negate"
        ? { type: "unblock" }
        : { type: "highlight", colorNumber: specifier.colorNumber };
    matches.push({
      lineNumber,
      rule: ruleset.ruleset.get(lineNumber) ?? "",
      action,
    });
  }
  return matches;
}

function resolveAction(matches: readonly Match[]): Action | null {
  return matches.length
    ? matches.reduce<Action>((acc, { action }) => dominantAction(acc, action), {
        type: "block",
      })
    : null;
}

function dominantAction(a: Action, b: Action): Action {
  function actionPriority(action: Action): number {
    if (action.type === "block") {
      return -1;
    } else if (action.type === "unblock") {
      return 0;
    } else {
      return action.colorNumber;
    }
  }
  return actionPriority(a) < actionPriority(b) ? b : a;
}

function satisfiesMode(action: Action | null, mode: PatchMode): boolean {
  if (mode === "block") {
    return action?.type === "block";
  } else if (mode === "unblock" || mode === "unhighlight") {
    return !action || action.type === "unblock";
  } else {
    return action?.type === "highlight";
  }
}

function suggestMatchPattern(
  mode: PatchMode,
  url: string,
  useRegistrableDomain: boolean,
): string {
  let host = new URL(url).hostname;
  if (useRegistrableDomain) {
    // `domain` is null when `host` itself is a public suffix (e.g.
    // `vercel.app`). Fall back to the bare host to avoid suggesting
    // `*.vercel.app`, which would match unrelated users' deployments.
    const domain = getRegistrableDomain(host);
    if (domain != null) {
      host = `*.${domain}`;
    }
  }
  const prefix =
    mode === "block"
      ? ""
      : mode === "unblock" || mode === "unhighlight"
        ? "@"
        : "@1";
  return `${prefix}*://${host}/*`;
}

type RulesetMatches = {
  rulesetName: string;
  matches: readonly Match[];
};

function collectMatchingRules(
  rulesetMatches: readonly RulesetMatches[],
): MatchingRules {
  const matchingRules: Record<ActionType, RulesetMatches[]> = {
    block: [],
    unblock: [],
    highlight: [],
  };
  for (const { rulesetName, matches } of rulesetMatches) {
    const grouped = groupBy(matches, ({ action }) => action.type);
    for (const type of ["block", "unblock", "highlight"] as const) {
      const entries = grouped[type];
      if (entries?.length) {
        matchingRules[type].push({ rulesetName, matches: entries });
      }
    }
  }
  return {
    block: formatMatchingRules(matchingRules.block),
    unblock: formatMatchingRules(matchingRules.unblock),
    highlight: formatMatchingRules(matchingRules.highlight),
  };
}

function formatMatchingRules(rulesetMatches: RulesetMatches[]): string {
  const lineNumberWidth = Math.max(
    1,
    ...rulesetMatches.flatMap(({ matches }) =>
      matches.map(({ lineNumber }) => lineNumber),
    ),
  ).toString().length;
  return rulesetMatches
    .flatMap(({ rulesetName, matches }) => [
      `# ${rulesetName}`,
      ...matches
        .toSorted(({ lineNumber: a }, { lineNumber: b }) => a - b)
        .map(
          ({ lineNumber, rule }) =>
            `${lineNumber.toString().padStart(lineNumberWidth, " ")}: ${rule}`,
        ),
      "",
    ])
    .join("\n")
    .trimEnd();
}
