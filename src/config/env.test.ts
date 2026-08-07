import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_IGNORED_SUBDOMAINS,
  parseIgnoredSubdomains,
} from "./env";

test("utilise @ et * comme sous-domaines ignorés par défaut", () => {
  assert.deepEqual(
    parseIgnoredSubdomains(undefined),
    [...DEFAULT_IGNORED_SUBDOMAINS],
  );
});

test("parse une liste personnalisée en supprimant espaces et doublons", () => {
  assert.deepEqual(
    parseIgnoredSubdomains(" internal, *, internal,  @ "),
    ["internal", "*", "@"],
  );
});

test("une valeur vide désactive l'exclusion par défaut", () => {
  assert.deepEqual(parseIgnoredSubdomains("  "), []);
});
