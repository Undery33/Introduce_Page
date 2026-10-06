export type CodingSearchState = {
  value: string;
  urlSearch: string;
  pendingSearches: readonly string[];
  composing: boolean;
};

export function createCodingSearchState(urlSearch: string): CodingSearchState {
  return {
    value: new URLSearchParams(urlSearch).get("q") ?? "",
    urlSearch,
    pendingSearches: [],
    composing: false,
  };
}

// URL updates can arrive after a newer keystroke. Acknowledging our own writes
// must never replace the current input or interrupt an active IME composition.
export function syncCodingSearchUrl(
  state: CodingSearchState,
  urlSearch: string,
): CodingSearchState {
  const pendingIndex = state.pendingSearches.lastIndexOf(urlSearch);
  if (pendingIndex >= 0) {
    return {
      ...state,
      urlSearch,
      pendingSearches: state.pendingSearches.slice(pendingIndex + 1),
    };
  }
  return createCodingSearchState(urlSearch);
}

export function changeCodingSearchInput(
  state: CodingSearchState,
  value: string,
  composing = state.composing,
): CodingSearchState {
  if (composing) return { ...state, value, composing };

  const latestSearch = state.pendingSearches.at(-1) ?? state.urlSearch;
  const params = new URLSearchParams(latestSearch);
  if (value) params.set("q", value);
  else params.delete("q");
  const search = params.toString();

  return {
    ...state,
    value,
    composing: false,
    pendingSearches:
      search === latestSearch
        ? state.pendingSearches
        : [...state.pendingSearches, search],
  };
}
