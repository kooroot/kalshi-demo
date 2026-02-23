# Shield & Scout — Kalshi Hedging Engine Design

> 2026-02-23 | Hackathon MVP Phase 2

---

## 1. 제품 피벗

**AS-IS:** "너 이거 좋아할 것 같아" (Personality 추천)
**TO-BE:** "너 포트폴리오에 이런 구멍이 있으니 Kalshi로 메워" (Smart Hedging Advisor)

**제품명:** Kalshi Shield & Scout
- **Scout** = 기존 Personality Analyzer (유지/개선)
- **Shield** = 포트폴리오 리스크 분석 + 헷징 계산기 + 주문 실행

---

## 2. 핵심 흐름

```
1. API Key 연결 (기존)
        ↓
2. Scout: 트레이딩 성향 분석 (기존 개선)
        ↓
3. Shield: 현재 포지션 → 리스크 노출도 계산 (신규)
        ↓
4. 관련 헷징 마켓 매핑 + 오더북 분석 (신규)
        ↓
5. 헷징 계산기: 필요 계약 수 + 비용 산출 (신규)
        ↓
6. 원클릭 주문 실행 via POST /orders (신규)
```

---

## 3. 신규 기능 상세

### 3.1 Portfolio Risk Dashboard

**데이터 소스:** `GET /portfolio/positions`

표시 항목:
- 보유 포지션 리스트 (ticker, side, quantity, avg_price)
- 포지션별 현재 가치 vs 진입 가격 (미실현 P&L)
- 카테고리별 concentration (% 분포)
- 총 노출도 (total exposure in $)

**리스크 프로필 자동 생성:**
- 단일 카테고리 > 50% → "Concentrated Risk" 경고
- 한 방향(YES only) 쏠림 → "Directional Bias" 경고
- 고가 포지션 비중 높음 → "Low Upside" 경고

### 3.2 Hedging Calculator

**입력:**
- 사용자가 헷지할 포지션 선택
- 방어 목표 금액 (또는 % 설정)

**계산 로직:**
```
계약당 순이익 = $1.00 (상환금) - 구매가
필요 계약 수 = 방어 목표액 / 계약당 순이익
헷징 비용 = 필요 계약 수 × 구매가
```

**오더북 기반 슬리피지:**
- `GET /markets/{ticker}/orderbook`
- Kalshi 특성: bids만 반환
- `YES_Ask = 100 - Best_NO_Bid`
- 대량 주문 시 각 가격 레벨별 체결 시뮬레이션
- 실질 평균 체결가 = Σ(가격 × 수량) / 총수량

### 3.3 Order Execution

**주문 흐름:**
1. 잔고 확인: `GET /portfolio/balance` (centi-cents 단위, ÷ 10000)
2. 잔고 충분 여부 검증
3. Limit Order 생성: `POST /orders`
   ```json
   {
     "ticker": "CPI-26FEB-A",
     "action": "buy",
     "side": "yes",
     "type": "limit",
     "count": 2000,
     "yes_price": 25
   }
   ```
4. 주문 상태 확인: `GET /portfolio/orders`

---

## 4. 기술 아키텍처 (업데이트)

### 4.1 라우팅

```
/ (Landing)              → API Key 연결
/profile/:id             → Scout: 성향 분석 + 추천
/dashboard/:id           → Shield: 포트폴리오 + 헷징 (신규)
```

### 4.2 Backend 신규 API

```
GET  /api/positions/:id     → 현재 포지션 + 리스크 분석
GET  /api/orderbook/:ticker → 오더북 + 슬리피지 계산
POST /api/hedge/:id         → 헷징 주문 실행
GET  /api/balance/:id       → 잔고 조회
```

### 4.3 Kalshi API 신규 호출

| Endpoint | 용도 |
|----------|------|
| `GET /portfolio/positions` | 보유 포지션 (이미 kalshi.ts에 존재) |
| `GET /markets/{ticker}/orderbook` | 오더북 (신규 구현) |
| `POST /portfolio/orders` | 주문 생성 (신규 구현) |
| `GET /portfolio/orders` | 주문 상태 확인 (신규 구현) |
| `GET /portfolio/balance` | 잔고 확인 (이미 존재) |

---

## 5. Dashboard UI 구성

```
┌─────────────────────────────────────────────────────┐
│ HEADER: KALSHI_OS │ Scout │ Shield │ Balance: $XX   │
├───────────────────────┬─────────────────────────────┤
│ POSITIONS             │ HEDGING CALCULATOR          │
│ ┌───────────────────┐ │ ┌─────────────────────────┐ │
│ │ SOL-PRICE > $200  │ │ │ Selected: SOL-PRICE     │ │
│ │ YES × 50 @ 65¢    │ │ │ Current Exposure: $32.5 │ │
│ │ P&L: +$4.50       │ │ │ Defense Target: $___    │ │
│ │ [HEDGE] btn       │ │ │ Contracts Needed: 43    │ │
│ └───────────────────┘ │ │ Est. Cost: $10.75       │ │
│ ┌───────────────────┐ │ │ Slippage: ~2.3%         │ │
│ │ CPI-FEB > 3.5%    │ │ │ [EXECUTE HEDGE] btn     │ │
│ │ NO × 100 @ 40¢    │ │ └─────────────────────────┘ │
│ │ P&L: -$2.00       │ │                             │
│ │ [HEDGE] btn       │ │ RISK ANALYSIS               │
│ └───────────────────┘ │ │ Concentration: ██████ 67% │
│                       │ │ Direction Bias: YES 80%   │
│ TOTAL EXPOSURE: $70   │ │ Category: Crypto 45%      │
│ UNREALIZED P&L: +$2.5 │ │ [⚠ HIGH CONCENTRATION]   │
└───────────────────────┴─────────────────────────────┘
```

---

## 6. 구현 순서

### Phase 2-A: 버그 수정 (30분)
1. analyzer.ts no_price 수정
2. win rate revenue 기반 수정

### Phase 2-B: Shield Backend (2-3시간)
1. orderbook endpoint + 슬리피지 계산
2. positions endpoint + 리스크 분석
3. hedge order execution endpoint
4. balance endpoint

### Phase 2-C: Shield Frontend (3-4시간)
1. Dashboard 페이지 레이아웃
2. Positions 패널
3. Hedging Calculator 패널
4. Risk Analysis 패널
5. Order execution flow + confirmation

### Phase 2-D: Scout 개선 + UX (1-2시간)
1. 추천 엔진 강화 (카테고리 승률 가중치, 다양성)
2. 프로필 카드 다운로드
3. Twitter 공유
4. 모바일 반응형
5. 네비게이션 (Scout ↔ Shield 전환)

---

## 7. 해커톤 어필 포인트

1. **API 활용도**: orderbook 분석, 주문 실행, 포지션 관리 — Kalshi API 전체 활용
2. **비즈니스 가치**: "도박"이 아닌 "리스크 관리 도구" 포지셔닝
3. **기술 완성도**: 슬리피지 계산, centi-cents 스케일링, RSA-PSS 인증
4. **독창성**: 성향 분석 + 헷징 = Shield & Scout 조합
