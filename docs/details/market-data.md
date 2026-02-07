# Market Data — 상세 레퍼런스

← [핵심 레퍼런스로 돌아가기](../kalshi-api-core.md#6-market-data-시장-조회)

---

## GET /markets — 전체 필드

### Query Parameters

| Parameter | Type | 설명 | 제약 |
|-----------|------|------|------|
| `limit` | integer | 페이지당 결과 수 | 1~1000, 기본 100 |
| `cursor` | string | 페이지네이션 커서 | |
| `event_ticker` | string | 이벤트 필터 (쉼표로 최대 10개) | |
| `series_ticker` | string | 시리즈 필터 | |
| `status` | string | unopened / open / paused / closed / settled | |
| `tickers` | string | 특정 마켓 티커들 (쉼표 구분) | |
| `min_created_ts` | integer | 생성 시점 이후 (Unix) | |
| `max_created_ts` | integer | 생성 시점 이전 (Unix) | |
| `min_updated_ts` | integer | 업데이트 이후 (다른 필터와 호환 불가) | |
| `min_close_ts` | integer | 종료 시점 이후 | |
| `max_close_ts` | integer | 종료 시점 이전 | |
| `min_settled_ts` | integer | 정산 시점 이후 | |
| `max_settled_ts` | integer | 정산 시점 이전 | |
| `mve_filter` | string | only (멀티변량만) / exclude (제외) | |

### Market Object 전체 필드

**식별자:**
- `ticker`, `event_ticker`, `market_type` (binary/scalar)

**타이틀:**
- `yes_sub_title`, `no_sub_title` — YES/NO 측 짧은 타이틀
- `title`, `subtitle` — deprecated

**시간:**
- `created_time`, `updated_time`, `open_time`, `close_time`
- `expected_expiration_time` (nullable)
- `latest_expiration_time` — 최대 만료 가능 시점
- `settlement_timer_seconds` — 결과 확정 후 정산까지 시간

**가격 (FixedPointDollars):**
- `yes_bid_dollars` / `yes_ask_dollars` — YES 최우선 매수/매도
- `no_bid_dollars` / `no_ask_dollars` — NO 최우선 매수/매도
- `last_price_dollars` — 최근 체결가
- `previous_yes_bid_dollars` / `previous_yes_ask_dollars` / `previous_price_dollars` — 하루 전

**거래량:**
- `volume_fp` — 전체 거래량
- `volume_24h_fp` — 24시간 거래량
- `open_interest_fp` — 미결제약정
- `liquidity_dollars` — 현재 호가 총 유동성
- `notional_value_dollars` — 계약 1개의 정산 시 가치

**정산:**
- `result`: yes / no / scalar / ""
- `expiration_value` — 정산에 사용된 값
- `settlement_value_dollars` — YES 측 정산 가치 (확정 후)
- `settlement_ts` — 정산 시점

**Strike (스칼라 마켓용):**
- `strike_type`: greater / greater_or_equal / less / less_or_equal / between / functional / custom / structured
- `floor_strike` / `cap_strike` — YES 정산 범위
- `functional_strike` — 값→정산값 매핑
- `custom_strike` — 타겟별 정산 조건

**기타:**
- `can_close_early`, `early_close_condition`
- `fee_waiver_expiration_time`
- `rules_primary`, `rules_secondary`
- `price_level_structure`, `price_ranges[]` (start, end, step)
- `is_provisional` — true면 활동 없으면 결과 확정 후 제거 가능
- `mve_collection_ticker`, `mve_selected_legs[]`

---

## GET /markets/{ticker}/orderbook — 상세

### Orderbook 구조

**최신 포맷 (orderbook_fp):**
```json
{
  "orderbook_fp": {
    "yes_dollars": [["price_dollars", "count_fp"], ...],
    "no_dollars":  [["price_dollars", "count_fp"], ...]
  }
}
```

**레거시 포맷 (deprecated):**
```json
{
  "orderbook": {
    "yes": [[price_cents, count], ...],
    "no":  [[price_cents, count], ...]
  }
}
```

### 호가 해석
- 배열은 **가격 오름차순** 정렬
- **마지막 요소 = best bid** (최우선 호가)
- YES bid @ X = NO ask @ (1.00 - X)
- 모든 정보는 bid만으로 표현 (ask는 역방향에서 도출)

### Spread 계산
```
best_yes_bid = yes_dollars의 마지막 원소의 가격
best_yes_ask = 1.00 - no_dollars의 마지막 원소의 가격
spread = best_yes_ask - best_yes_bid
```

---

## GET /markets/trades — 전체 필드

| Field | Type | 설명 |
|-------|------|------|
| `trade_id` | string | 고유 체결 ID |
| `ticker` | string | 마켓 티커 |
| `yes_price_dollars` | FPD | YES 가격 |
| `no_price_dollars` | FPD | NO 가격 |
| `count_fp` | FPC | 계약 수 |
| `taker_side` | enum | yes / no |
| `created_time` | datetime | 체결 시각 |

---

## GET /series/{series_ticker}/markets/{ticker}/candlesticks — 전체

### Parameters
| Name | Required | 설명 |
|------|----------|------|
| `series_ticker` | O | 시리즈 티커 |
| `ticker` | O | 마켓 티커 |
| `start_ts` | O | 시작 Unix timestamp |
| `end_ts` | O | 종료 Unix timestamp |
| `period_interval` | O | 1 (1분) / 60 (1시간) / 1440 (1일) |
| `include_latest_before_start` | X | true면 start 이전 최신 캔들 포함 |

### Candlestick Object
```
end_period_ts       — 기간 종료 시각
yes_bid.{open, high, low, close}_dollars  — YES 매수 OHLC
yes_ask.{open, high, low, close}_dollars  — YES 매도 OHLC
price.{open, high, low, close, mean, min, max}_dollars — 체결가 OHLC+
volume_fp           — 기간 내 거래량
open_interest_fp    — 기간 종료 시 미결제약정
```

---

## GET /events — 전체

| Parameter | 설명 |
|-----------|------|
| `limit` | 1~200, 기본 200 |
| `cursor` | 페이지네이션 |
| `status` | open / closed / settled |
| `series_ticker` | 시리즈 필터 |
| `with_nested_markets` | true면 하위 마켓 포함 |
| `with_milestones` | true면 마일스톤 포함 |
| `min_close_ts` | 최소 1개 마켓의 close가 이 시점 이후 |

### EventData Object
- `event_ticker`, `series_ticker`, `title`, `sub_title`
- `category`, `strike_date`, `strike_period`
- `mutually_exclusive` — true면 1개 마켓만 YES 가능
- `collateral_return_type` — 정산 시 담보 반환 방식
- `available_on_brokers`
- `markets[]` — nested markets (옵션)

---

## GET /exchange/status

인증 불필요.

```json
{
  "exchange_active": true,      // false면 거래소 완전 중단
  "trading_active": true,       // false면 거래만 중단
  "exchange_estimated_resume_time": "2026-02-03T12:00:00Z"  // nullable
}
```

## GET /exchange/schedule

운영 시간 (모두 ET 기준):
- `standard_hours[]` — 요일별 `open_time` / `close_time`
- `maintenance_windows[]` — `start_datetime` / `end_datetime`
