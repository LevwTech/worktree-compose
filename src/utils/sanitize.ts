export function sanitize(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-/, "")
    .replace(/-$/, "");
}

export function composeProjectName(
  repoName: string,
  index: number,
  branch: string,
): string {
  return sanitize(`${repoName}-wt-${index}-${branch}`);
}
