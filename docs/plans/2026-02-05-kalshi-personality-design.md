# Kalshi Personality — 설계 문서

> 해커톤 MVP 설계 (2026-02-05)

---

## 1. 제품 개요

**제품명:** Kalshi Personality

**핵심 가치:** 유저의 베팅 이력을 분석해서 트레이딩 성향을 시각화하고, 그에 맞는 마켓을 추천

**타겟:** Kalshi 유저 (demo.kalshi.co 테스트넷, 향후 메인넷)

---

## 2. 핵심 흐름

```
1. 유저가 API Key 입력 (Kalshi에서 발급)
        ↓
2. 백엔드에서 fills/settlements/markets 데이터 fetch
        ↓
3. Personality 분석 (카테고리 분포, 리스크 성향, 승률, ROI, 빈도)
        ↓
4. 프로필 카드 생성 + 공유 링크 발급
        ↓
5. 분석 결과 기반 마켓 추천 리스트 표시
        ↓
6. 마켓 클릭 → Kalshi로 이동
```

---

## 3. Personality 분석 로직

### 3.1 분석 지표

| 지표 | 계산 방식 | 시각화 |
|------|----------|--------|
| **선호 카테고리** | fills → market → series.category 집계 | 도넛 차트 |
| **리스크 성향** | 진입 가격 분포 (< 30¢ = High Risk, 30-70¢ = Moderate, > 70¢ = Conservative) | 게이지 or 태그 |
| **승률** | settlements에서 (revenue > 0인 건수) / 전체 | 퍼센트 + 링 |
| **ROI** | 총 revenue / 총 cost | 퍼센트 |
| **베팅 빈도** | fills 개수 / 활동 기간(일) | "일 평균 N회" |

### 3.2 Personality 태그

분석 결과 조합으로 재미있는 태그 부여:

- 저확률 + 높은 빈도 → "Degen Gambler 🎰"
- 고확률 + 높은 승률 → "Safe Player 🛡️"
- Politics 집중 → "Political Junkie 🏛️"
- 다양한 카테고리 → "Curious Explorer 🔍"

### 3.3 추천 로직

1. 선호 카테고리에서 아직 안 베팅한 open 마켓 필터
2. 리스크 성향에 맞는 가격대 (yes_bid) 필터
3. 거래량/유동성 순 정렬
4. 상위 10개 추천

---

## 4. 기술 아키텍처

```
┌─────────────────────────────────────────────────────────┐
│                      Frontend                           │
│  TanStack Router + Query + Tailwind + shadcn/ui         │
│  - /: 랜딩 + API Key 입력                                │
│  - /profile/:id: 프로필 카드 + 추천 리스트                 │
└─────────────────────┬───────────────────────────────────┘
                      │ fetch
┌─────────────────────▼───────────────────────────────────┐
│                   Backend (Hono + Bun)                  │
│  POST /api/connect     - API Key 검증 + 프로필 ID 발급    │
│  GET  /api/profile/:id - Personality 분석 결과           │
│  GET  /api/recommend/:id - 추천 마켓 리스트               │
└─────────────────────┬───────────────────────────────────┘
                      │ kalshi-typescript SDK
┌─────────────────────▼───────────────────────────────────┐
│                    Kalshi API                           │
│  GET /portfolio/fills, /settlements, /positions         │
│  GET /markets, /events, /series                         │
└─────────────────────────────────────────────────────────┘
```

### 4.1 스택

| 레이어 | 기술 |
|--------|------|
| Runtime | Bun |
| Frontend | TanStack Router + Query |
| UI | Tailwind CSS + shadcn/ui |
| Backend | Hono |
| Kalshi API | kalshi-typescript SDK |
| DB | SQLite (Bun built-in) |

### 4.2 Storage

```sql
-- profiles 테이블
CREATE TABLE profiles (
  id TEXT PRIMARY KEY,           -- UUID
  api_key_id TEXT NOT NULL,      -- Kalshi API Key ID
  created_at INTEGER NOT NULL,   -- Unix timestamp
  analysis_cache TEXT            -- JSON (분석 결과 캐싱)
);
```

**보안:**
- Private Key는 서버 메모리에서만 사용, DB 저장 X
- 프로필 ID는 UUID (추측 불가)

---

## 5. 화면 구성

### 5.1 랜딩 페이지 (`/`)

- 헤드라인 + 간단한 설명
- API Key ID 입력 필드
- Private Key 파일 업로드 또는 텍스트 붙여넣기
- "Connect" 버튼 → 성공 시 `/profile/:id`로 이동

### 5.2 프로필 페이지 (`/profile/:id`)

**상단: Personality 카드**
- 유저 태그 ("Degen Gambler 🎰" 등)
- 5가지 지표 시각화 (차트 + 숫자)
- "Share" 버튼 (링크 복사)
- "Download" 버튼 (이미지 저장)

**하단: 추천 마켓 리스트**
- 카드 형태
- 각 카드: 마켓명 / 카테고리 / 현재 가격 / 추천 이유
- 클릭 → Kalshi 마켓 페이지 (새 탭)
- [껍데기] 북마크 버튼 (Coming Soon)
- [껍데기] 베팅 버튼 (Coming Soon)

---

## 6. MVP 스코프

### 포함

- [x] API Key 연결
- [x] Personality 분석 (5가지 지표)
- [x] Personality 태그 생성
- [x] 프로필 카드 시각화
- [x] 공유 링크
- [x] 이미지 다운로드
- [x] 마켓 추천 리스트
- [x] Kalshi 마켓 페이지 링크

### 제외 (향후)

- [ ] 로그인/회원가입 시스템
- [ ] 북마크 실제 기능
- [ ] 앱 내 베팅
- [ ] NFT 민팅
- [ ] 메인넷 연동 (현재 demo.kalshi.co만)
- [ ] OAuth 연동 (Kalshi 미지원)

---

## 7. 환경 설정

**Demo (테스트넷):**
- API: `https://demo-api.kalshi.co/trade-api/v2`
- Web: `https://demo.kalshi.co`

**Production (향후):**
- API: `https://api.elections.kalshi.com/trade-api/v2`
- Web: `https://kalshi.com`
