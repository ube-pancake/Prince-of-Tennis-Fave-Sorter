export const createSortState = (ids) => ({
  runs: ids.map((id) => [[id]]),
  nextRuns: [],
  rejected: [],
  pairIndex: 0,
  leftIndex: 0,
  rightIndex: 0,
  merged: [],
  comparisons: 0,
})

const clone = (value) => JSON.parse(JSON.stringify(value))

const resetMerge = (state, runs) => {
  state.runs = runs
  state.nextRuns = []
  state.pairIndex = 0
  state.leftIndex = 0
  state.rightIndex = 0
  state.merged = []
}

// Once the main sort finishes, each tied group is sorted again on its own
// (left/right only) and spliced back in, so the final ranking has no ties.
const normalize = (input) => {
  const state = clone(input)
  state.rejected ??= []

  for (;;) {
    mergeRuns(state)
    if (state.runs.length > 1) return state

    if (state.tiebreak) {
      state.final.splice(state.tiebreak.index, 1, ...(state.runs[0] ?? []))
      state.tiebreak = null
    }
    const final = state.final ?? state.runs[0] ?? []
    const index = final.findIndex((group) => group.length > 1)
    if (index === -1) {
      state.runs = [final]
      state.final = null
      return state
    }
    state.final = final
    state.tiebreak = { index }
    resetMerge(state, final[index].map((id) => [[id]]))
  }
}

const mergeRuns = (state) => {
  while (state.runs.length > 1) {
    if (state.pairIndex >= state.runs.length) {
      resetMerge(state, state.nextRuns)
      continue
    }

    if (state.pairIndex === state.runs.length - 1) {
      state.nextRuns.push(state.runs[state.pairIndex])
      state.pairIndex += 1
      continue
    }

    const left = state.runs[state.pairIndex]
    const right = state.runs[state.pairIndex + 1]

    if (state.leftIndex >= left.length || state.rightIndex >= right.length) {
      state.merged.push(...left.slice(state.leftIndex), ...right.slice(state.rightIndex))
      state.nextRuns.push(state.merged)
      state.pairIndex += 2
      state.leftIndex = 0
      state.rightIndex = 0
      state.merged = []
      continue
    }
    return
  }
}

export const currentPair = (input) => {
  const state = normalize(input)
  if (state.runs.length <= 1) return { state, pair: null }
  return {
    state,
    pair: [
      state.runs[state.pairIndex][state.leftIndex],
      state.runs[state.pairIndex + 1][state.rightIndex],
    ],
  }
}

export const applyChoice = (input, choice) => {
  const { state, pair } = currentPair(input)
  if (!pair) return state
  if (state.tiebreak && choice !== 'left' && choice !== 'right') return input

  if (choice === 'left') {
    state.merged.push(pair[0])
    state.leftIndex += 1
  } else if (choice === 'right') {
    state.merged.push(pair[1])
    state.rightIndex += 1
  } else if (choice === 'neither') {
    state.rejected.push(...pair[0], ...pair[1])
    state.leftIndex += 1
    state.rightIndex += 1
  } else {
    state.merged.push([...pair[0], ...pair[1]])
    state.leftIndex += 1
    state.rightIndex += 1
  }
  state.comparisons += 1
  return normalize(state)
}

export const getResult = (input) => {
  const state = normalize(input)
  return state.runs.length === 1 ? state.runs[0] : null
}

export const estimateComparisons = (count) => Math.max(1, Math.ceil(count * Math.log2(Math.max(2, count)) - count + 1))
