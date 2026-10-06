import { test } from "node:test";
import assert from "node:assert/strict";
import {
  changeCodingSearchInput,
  createCodingSearchState,
  syncCodingSearchUrl,
} from "../src/lib/coding-search-state";

test("initial state restores raw search text and repeated filter parameters", () => {
  const search = new URLSearchParams([
    ["category", "infrastructure"],
    ["tag", "DNS"],
    ["tag", "Ubuntu"],
    ["q", "  한글 DNS "],
  ]).toString();
  assert.deepEqual(createCodingSearchState(search), {
    value: "  한글 DNS ",
    urlSearch: search,
    pendingSearches: [],
    composing: false,
  });
  assert.equal(createCodingSearchState("category=network").value, "");
});

test("Korean IME keeps every intermediate syllable local and queues only the committed text", () => {
  const initialSearch = "category=infrastructure&tag=DNS&tag=Ubuntu";
  let state = { ...createCodingSearchState(initialSearch), composing: true };

  for (const value of ["ㅎ", "하", "한", "한ㄱ", "한글"]) {
    state = changeCodingSearchInput(state, value, true);
    assert.equal(state.value, value);
    assert.equal(state.composing, true);
    assert.equal(state.urlSearch, initialSearch);
    assert.deepEqual(state.pendingSearches, []);
  }

  state = changeCodingSearchInput(state, "한글", false);
  assert.equal(state.composing, false);
  assert.equal(state.pendingSearches.length, 1);
  const committedSearch = state.pendingSearches[0];
  const params = new URLSearchParams(committedSearch);
  assert.equal(params.get("q"), "한글");
  assert.equal(params.get("category"), "infrastructure");
  assert.deepEqual(params.getAll("tag"), ["DNS", "Ubuntu"]);

  state = syncCodingSearchUrl(state, committedSearch);
  assert.equal(state.value, "한글");
  assert.equal(state.urlSearch, committedSearch);
  assert.deepEqual(state.pendingSearches, []);
});

test("a delayed own URL acknowledgement cannot replace a newer Korean composition", () => {
  let state = changeCodingSearchInput(createCodingSearchState(""), "u");
  const pendingEnglishSearch = state.pendingSearches[0];
  state = { ...state, composing: true };
  state = changeCodingSearchInput(state, "uㅎ");
  state = syncCodingSearchUrl(state, pendingEnglishSearch);
  assert.equal(state.value, "uㅎ");
  assert.equal(state.composing, true);
  assert.deepEqual(state.pendingSearches, []);

  state = changeCodingSearchInput(state, "u한글");
  assert.deepEqual(state.pendingSearches, []);
  state = changeCodingSearchInput(state, "u한글", false);
  assert.equal(new URLSearchParams(state.pendingSearches[0]).get("q"), "u한글");
  assert.equal(state.composing, false);
});

test("rapid English input and spaces survive delayed acknowledgements of earlier keystrokes", () => {
  let state = createCodingSearchState("category=infrastructure&tag=DNS");
  const values = ["u", "ub", "ubuntu", "ubuntu ", "ubuntu D", "ubuntu DNS"];
  for (const value of values) {
    state = changeCodingSearchInput(state, value);
    assert.equal(state.value, value);
  }
  const writes = [...state.pendingSearches];
  assert.deepEqual(
    writes.map((search) => new URLSearchParams(search).get("q")),
    values,
  );

  for (const [index, search] of writes.entries()) {
    state = syncCodingSearchUrl(state, search);
    assert.equal(state.value, "ubuntu DNS");
    assert.equal(state.composing, false);
    assert.equal(state.urlSearch, search);
    assert.equal(state.pendingSearches.length, writes.length - index - 1);
  }
});

test("typing and clearing search preserve category and every selected tag", () => {
  const initial = Object.freeze(
    createCodingSearchState(
      "category=infrastructure&tag=DNS&tag=Linux&q=Ubuntu",
    ),
  );
  let state = changeCodingSearchInput(initial, "Rocky DNS ");
  let params = new URLSearchParams(state.pendingSearches.at(-1));
  assert.equal(params.get("q"), "Rocky DNS ");
  assert.equal(params.get("category"), "infrastructure");
  assert.deepEqual(params.getAll("tag"), ["DNS", "Linux"]);

  state = changeCodingSearchInput(state, "");
  params = new URLSearchParams(state.pendingSearches.at(-1));
  assert.equal(params.has("q"), false);
  assert.equal(params.get("category"), "infrastructure");
  assert.deepEqual(params.getAll("tag"), ["DNS", "Linux"]);
  assert.equal(initial.value, "Ubuntu");
  assert.deepEqual(initial.pendingSearches, []);
});

test("back navigation and external filter changes restore their URL state", () => {
  const originalSearch = "category=infrastructure&tag=DNS&q=Ubuntu";
  let state = changeCodingSearchInput(
    createCodingSearchState(originalSearch),
    "Rocky",
  );
  state = syncCodingSearchUrl(state, state.pendingSearches[0]);
  state = syncCodingSearchUrl(state, originalSearch);
  assert.deepEqual(state, createCodingSearchState(originalSearch));

  state = changeCodingSearchInput(state, "Ubuntu DNS");
  state = { ...state, composing: true };
  state = changeCodingSearchInput(state, "ㅎ");
  const externalSearch = "category=network&tag=HTTPS&q=TLS";
  state = syncCodingSearchUrl(state, externalSearch);
  assert.deepEqual(state, createCodingSearchState(externalSearch));
});

test("unchanged text and duplicate composition-end events do not enqueue duplicate URLs", () => {
  const initial = createCodingSearchState("q=Ubuntu");
  let state = changeCodingSearchInput(initial, "Ubuntu");
  assert.deepEqual(state.pendingSearches, []);

  state = changeCodingSearchInput(state, "Ubuntu DNS", false);
  const pending = [...state.pendingSearches];
  state = changeCodingSearchInput(state, "Ubuntu DNS", false);
  assert.deepEqual(state.pendingSearches, pending);
});
