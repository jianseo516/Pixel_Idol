export interface MyPageNavigationResult {
  readonly shouldOpen: boolean;
  readonly cleanedPath: string;
}

export function consumeMyPageQuery(pathname: string, search: string): MyPageNavigationResult {
  const parameters = new URLSearchParams(search);
  const shouldOpen = parameters.get("mypage") === "1";
  parameters.delete("mypage");
  const remaining = parameters.toString();
  return { shouldOpen, cleanedPath: remaining ? `${pathname}?${remaining}` : pathname };
}
