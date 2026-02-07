# Orders — 상세 레퍼런스

← [핵심 레퍼런스로 돌아가기](../kalshi-api-core.md#7-orders-주문)

---

## POST /portfolio/orders — CreateOrder 전체 필드

### Request Body

| Field | Type | Required | 설명 |
|-------|------|----------|------|
| `ticker` | string | O | 마켓 티커 (min length 1) |
| `side` | enum | O | `yes` / `no` |
| `action` | enum | O | `buy` / `sell` |
| `client_order_id` | string | X | 중복 방지용 UUID |
| `count` | integer | X | 계약 수 (min 1) — deprecated 예정 |
| `count_fp` | FPC | X | 계약 수 (문자열 "10.00") |
| `type` | enum | X | `limit` / `market` |
| `yes_price` | integer | X | YES 가격 (1~99 cents) — deprecated |
| `no_price` | integer | X | NO 가격 (1~99 cents) — deprecated |
| `yes_price_dollars` | FPD | X | YES 가격 ("0.4200") |
| `no_price_dollars` | FPD | X | NO 가격 ("0.5800") |
| `expiration_ts` | int64 | X | 주문 만료 Unix timestamp |
| `time_in_force` | enum | X | `fill_or_kill` / `good_till_canceled` / `immediate_or_cancel` |
| `buy_max_cost` | integer | X | 최대 비용 (cents), FoK 활성화 |
| `post_only` | boolean | X | true면 maker만 (즉시 체결 시 거부) |
| `reduce_only` | boolean | X | true면 기존 포지션 축소만 가능 |
| `self_trade_prevention_type` | enum | X | `taker_at_cross` / `maker` |
| `order_group_id` | string | X | Order Group에 연결 |
| `cancel_order_on_pause` | boolean | X | 거래 일시중지 시 자동 취소 |
| `subaccount` | integer | X | 0(기본)~32 |

### Order Response Object

| Field | Type | 설명 |
|-------|------|------|
| `order_id` | string | 서버 발급 주문 ID |
| `user_id` | string | 유저 ID |
| `client_order_id` | string | 클라이언트 지정 ID |
| `ticker` | string | 마켓 티커 |
| `side` | enum | yes / no |
| `action` | enum | buy / sell |
| `type` | enum | limit / market |
| `status` | enum | `resting` (대기) / `canceled` / `executed` (완전체결) |
| `yes_price_dollars` | FPD | YES 가격 |
| `no_price_dollars` | FPD | NO 가격 |
| `initial_count_fp` | FPC | 최초 주문 수량 |
| `fill_count_fp` | FPC | 체결된 수량 |
| `remaining_count_fp` | FPC | 잔여 수량 |
| `taker_fees_dollars` | FPD | Taker 수수료 |
| `maker_fees_dollars` | FPD | Maker 수수료 |
| `taker_fill_cost_dollars` | FPD | Taker 체결 비용 |
| `maker_fill_cost_dollars` | FPD | Maker 체결 비용 |
| `created_time` | datetime | 생성 시각 |
| `last_update_time` | datetime | 마지막 업데이트 (수정/취소/체결) |
| `expiration_time` | datetime | 만료 시각 (nullable) |
| `self_trade_prevention_type` | enum | STP 설정 |
| `order_group_id` | string | 소속 Order Group |
| `cancel_order_on_pause` | boolean | 일시중지 시 취소 여부 |
| `subaccount_number` | integer | 서브계좌 번호 |

---

## POST /portfolio/orders/{order_id}/amend — 주문 수정

가격과 수량 동시 변경 가능.

### Request

| Field | Required | 설명 |
|-------|----------|------|
| `ticker` | O | 마켓 티커 |
| `side` | O | yes / no |
| `action` | O | buy / sell |
| `client_order_id` | X | 기존 client ID |
| `updated_client_order_id` | X | 새 client ID |
| `count` / `count_fp` | X | 새 수량 |
| `yes_price` / `yes_price_dollars` | X | 새 가격 |
| `subaccount` | X | 서브계좌 |

### Response
```json
{
  "order": { /* 수정된 주문 */ },
  "old_order": { /* 수정 전 주문 */ }
}
```

---

## POST /portfolio/orders/{order_id}/decrease — 수량 감소

| Field | 설명 |
|-------|------|
| `reduce_by` / `reduce_by_fp` | N개 만큼 줄이기 |
| `reduce_to` / `reduce_to_fp` | N개로 맞추기 |

**둘 중 하나만 사용.** 둘 다 보내면 에러.

### Response
```json
{
  "order": { /* 업데이트된 주문 */ },
  "reduced_by": 5,
  "reduced_by_fp": "5.00"
}
```

---

## DELETE /portfolio/orders/{order_id} — 취소

- Query: `subaccount` (optional)
- 완전 삭제가 아님 — remaining을 0으로 설정
- 부분 체결된 주문은 남은 부분만 취소

---

## POST /portfolio/orders/batched — 배치 생성

- 최대 20개 주문/배치
- 각 주문은 rate limit에 개별 카운트
- 개별 주문의 성공/실패는 독립적

### Request
```json
{
  "orders": [
    { "ticker": "...", "side": "yes", "action": "buy", ... },
    { "ticker": "...", "side": "no", "action": "sell", ... }
  ]
}
```

### Response (201)
```json
{
  "orders": [
    { "order": { ... } },           // 성공
    { "error": { "code": "...", "message": "..." } }  // 실패
  ]
}
```

---

## POST /portfolio/orders/batched/cancel — 배치 취소

- 각 취소는 rate limit에서 **0.2건**으로 카운트

---

## GET /portfolio/orders/{order_id}/queue_position — 큐 위치

**DEPRECATED** — 항상 0 반환

---

## Time-in-Force 옵션

| 값 | 동작 |
|----|------|
| `good_till_canceled` | 취소/체결/만료까지 유지 (기본) |
| `fill_or_kill` | 즉시 전량 체결 또는 전량 취소 |
| `immediate_or_cancel` | 즉시 가능한 만큼 체결, 나머지 취소 |

## Self-Trade Prevention

| 값 | 동작 |
|----|------|
| `taker_at_cross` | 자기 주문과 매칭 시 taker 측 취소 |
| `maker` | 자기 주문과 매칭 시 maker 측 취소 |
