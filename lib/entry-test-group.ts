/** System-managed group for entry test candidates — not assignable manually. */
export const ENTRY_TEST_GROUP_NAME = "ENTRY TEST"

export function isEntryTestGroup(group: { name: string }): boolean {
  return group.name === ENTRY_TEST_GROUP_NAME
}

export function findEntryTestGroupId(
  groups: { id: string; name: string }[],
): string | undefined {
  return groups.find((g) => isEntryTestGroup(g))?.id
}

/** Groups that teachers may pick in filters and assignment dialogs. */
export function selectableGroups<T extends { name: string }>(groups: T[]): T[] {
  return groups.filter((g) => !isEntryTestGroup(g))
}
