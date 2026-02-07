# Portfolio — 상세 레퍼런스

← [핵심 레퍼런스로 돌아가기](../kalshi-api-core.md#8-portfolio-포트폴리오)

---

## GET /portfolio/balance

인증 필수.

### Response
| Field | Type | 설명 |
|-------|------|------|
| `balance` | int64 | 가용 잔고 (cents) |
| `portfolio_value` | int64 | 포트폴리오 총 가치 (cents) |
| `updated_ts` | int64 | 마지막 업데이트 Unix timestamp |

---

## GET /portfolio/positions — 전체 필드

### Query Parameters
| Parameter | Type | 설명 |
|-----------|------|------|
| `cursor` | string | 페이지네이션 |
| `limit` | integer | 1~1000, 기본 100 |
| `count_filter` | string | `position`, `total_traded` (쉼표 구분, 0이 아닌 것만) |
| `ticker` | string | 마켓 티커 필터 |
| `event_ticker` | string | 이벤트 티커 (최대 10개, 쉼표) |
| `subaccount` | integer | 0~32, 생략 시 전체 |

### Response — MarketPosition

| Field | Type | 설명 |
|-------|------|------|
| `ticker` | string | 마켓 티커 |
| `position` | integer | 현재 포지션 (+ = YES, - = NO) |
| `total_traded` | integer | 총 거래량 |
| `market_exposure` | integer | 시장 노출 (cents) |
| `realized_pnl` | integer | 실현 손익 (cents) |
| `fees_paid` | integer | 지불한 수수료 (cents) |
| *_fp 버전 | FPC | 위 각 필드의 fixed-point 버전 |

### Response — EventPosition

| Field | Type | 설명 |
|-------|------|------|
| `event_ticker` | string | 이벤트 티커 |
| `total_cost` | integer | 총 비용 (cents) |
| `total_cost_shares` | integer | 주식 비용 |
| `event_exposure` | integer | 이벤트 노출 |
| `realized_pnl` | integer | 실현 손익 |
| `fees_paid` | integer | 수수료 |
| *_fp 버전 | FPC | fixed-point 버전 |

---

## GET /portfolio/fills — 전체 필드

### Query Parameters
| Parameter | Type | 설명 |
|-----------|------|------|
| `ticker` | string | 마켓 필터 |
| `order_id` | string | 주문 필터 |
| `min_ts` | int64 | 시점 이후 |
| `max_ts` | int64 | 시점 이전 |
| `limit` | integer | 1~200, 기본 100 |
| `cursor` | string | 페이지네이션 |
| `subaccount` | integer | 0~32 |

### Fill Object

| Field | Type | 설명 |
|-------|------|------|
| `fill_id` | string | 체결 ID |
| `trade_id` | string | 체결 대응 거래 ID |
| `order_id` | string | 주문 ID |
| `client_order_id` | string | 클라이언트 주문 ID |
| `ticker` | string | 마켓 티커 |
| `market_ticker` | string | 마켓 티커 (동일) |
| `side` | enum | yes / no |
| `action` | enum | buy / sell |
| `count` | integer | 계약 수 |
| `count_fp` | FPC | 계약 수 (FP) |
| `yes_price` | integer | YES 가격 (cents) |
| `no_price` | integer | NO 가격 (cents) |
| `yes_price_fixed` | FPD | YES 가격 (dollars) |
| `no_price_fixed` | FPD | NO 가격 (dollars) |
| `is_taker` | boolean | Taker 여부 |
| `fee_cost` | string | 수수료 (4 decimal) |
| `created_time` | datetime | 체결 시각 |
| `subaccount_number` | integer | 서브계좌 |

---

## GET /portfolio/settlements — 전체 필드

### Query Parameters
| Parameter | Type | 설명 |
|-----------|------|------|
| `limit` | integer | 1~200, 기본 100 |
| `cursor` | string | 페이지네이션 |
| `ticker` | string | 마켓 필터 |
| `event_ticker` | string | 이벤트 필터 (최대 10개) |
| `min_ts` / `max_ts` | int64 | 시점 필터 |
| `subaccount` | integer | 0~32 |

### Settlement Object

| Field | Type | 설명 |
|-------|------|------|
| `ticker` | string | 마켓 티커 |
| `event_ticker` | string | 이벤트 티커 |
| `market_result` | enum | yes / no / scalar / void |
| `yes_count` / `yes_count_fp` | int / FPC | 보유 YES 수량 |
| `yes_total_cost` | integer | YES 원가 (cents) |
| `no_count` / `no_count_fp` | int / FPC | 보유 NO 수량 |
| `no_total_cost` | integer | NO 원가 (cents) |
| `revenue` | integer | 총 수령액 (cents) |
| `settled_time` | datetime | 정산 시각 |
| `fee_cost` | string | 수수료 (4 decimal) |
| `value` | integer (nullable) | YES 1계약 정산 가치 (cents) |

---

## Subaccounts

### POST /portfolio/subaccounts — 서브계좌 생성
### GET /portfolio/subaccounts/balances — 전체 서브계좌 잔고
### POST /portfolio/subaccounts/transfer — 계좌 간 이체

서브계좌는 1~32번까지 생성 가능. 0번은 항상 기본(primary) 계좌.
주문/포지션/잔고를 독립적으로 관리 가능.
