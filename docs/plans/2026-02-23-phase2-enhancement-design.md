# Phase 2: Kalshi Personality — Enhancement Design

> 2026-02-23

---

## Phase 2-A: Bug Fixes (Critical)

### A1. no_price 필드 누락 수정
- `analyzer.ts` FillData 인터페이스에 `no_price` 없음
- Kalshi API는 `yes_price`만 제공 → `no_price = 100 - yes_price`로 계산
- 파일: `backend/src/services/analyzer.ts:4-10, 156-161`

### A2. Win rate 계산 결함 수정
- 현재: YES 포지션 있고 결과가 YES면 win으로 판정
- 문제: YES/NO 양쪽 다 보유한 경우 부정확
- 수정: `revenue > total_cost`이면 win, 아니면 loss (실제 수익 기반)
- 파일: `backend/src/services/analyzer.ts:178-194`

---

## Phase 2-B: Recommendation Engine Enhancement

### B1. 카테고리별 승률 가중치
- settlements에서 카테고리별 win rate 계산
- 승률 높은 카테고리 마켓에 점수 부스트 (승률 * 가중치)

### B2. 마감 임박도 반영
- market.close_time 기준, 24h-7일 내 마감 마켓에 보너스
- 너무 임박한 건 (< 1h) 제외

### B3. 유동성 점수
- volume_24h + open_interest 합산 정규화
- 유동성 높을수록 점수 UP

### B4. 다양성 보장
- 같은 카테고리 최대 3개까지만
- 나머지 슬롯은 다른 카테고리로 채움

### B5. 추천 이유 구체화
- "Politics 카테고리 승률 73%" 같은 데이터 기반 reason
- 복합 reason (카테고리 + 가격대 매칭 등)

---

## Phase 2-C: UX Enhancement

### C1. 프로필 카드 이미지 다운로드
- html2canvas로 PersonalityHero 섹션 → PNG
- "Download Card" 버튼 활성화

### C2. Twitter/X 공유
- Share 버튼 옆에 Twitter 버튼 추가
- `https://twitter.com/intent/tweet?text=...&url=...` 형태

### C3. 모바일 반응형 개선
- 프로필 카드 모바일 레이아웃 최적화
- 추천 카드 1열 → 2열 전환점 조정
- 터치 친화적 버튼 크기

### C4. Disconnect/뒤로가기
- 헤더에 disconnect 버튼 추가
- 클릭 시 세션 클리어 + 랜딩으로 이동

### C5. Share 복사 완료 피드백
- 복사 성공 시 버튼 텍스트 임시 변경 ("Copied!")
- 2초 후 원래로 복구

---

## 구현 순서

1. Phase 2-A (버그 수정) — 먼저
2. Phase 2-B (추천 엔진) — 핵심 가치
3. Phase 2-C (UX) — 마무리
