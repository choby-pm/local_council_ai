// 의회별 상임위원회 목록. 위원회 구성은 임기(4년) 중 거의 바뀌지 않아 고정값으로 둔다.
// 의회운영위원회는 다른 상임위와 겸임하는 위원회라 맨 뒤에 둔다.
const COMMITTEES_BY_COUNCIL: Record<string, string[]> = {
  고양특례시의회: ["건설교통위원회", "기획행정위원회", "문화복지위원회", "환경경제위원회", "의회운영위원회"],
};

export function committeesFor(council: string): string[] {
  return COMMITTEES_BY_COUNCIL[council] ?? [];
}
