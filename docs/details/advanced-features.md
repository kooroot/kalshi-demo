# 고급 기능 — 상세 레퍼런스

← [핵심 레퍼런스로 돌아가기](../kalshi-api-core.md#11-고급-기능)

---

## 1. Order Groups

**용도:** 특정 기간 내 최대 체결량 제한 (리스크 관리)

### 메커니즘
- 15초 롤링 윈도우 내 체결 계약 수가 `contracts_limit`에 도달하면:
  - 그룹 내 **모든 주문 자동 취소**
  - Reset 전까지 새 주문 불가

### 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| POST | /portfolio/order_groups/create | 그룹 생성 |
| GET | /portfolio/order_groups | 그룹 목록 |
| GET | /portfolio/order_groups/{id} | 그룹 상세 |
| DELETE | /portfolio/order_groups/{id} | 그룹 삭제 |
| POST | /portfolio/order_groups/{id}/reset | 리셋 (재활성화) |
| POST | /portfolio/order_groups/{id}/trigger | 수동 트리거 (전 주문 취소) |
| PUT | /portfolio/order_groups/{id}/limit | 한도 변경 |

### CreateOrderGroup Request
```json
{
  "contracts_limit": 100,        // 또는
  "contracts_limit_fp": "100.00",
  "subaccount": 0
}
```

### Response
```json
{
  "order_group_id": "uuid-here"
}
```

### 주문에 연결
주문 생성 시 `"order_group_id": "uuid-here"` 포함

---

## 2. RFQ (Request for Quote)

**용도:** 대량 거래 시 counterparty에게 직접 호가 요청

### 흐름
```
1. RFQ 생성 (POST /communications/rfqs)
   ↓
2. Counterparty가 Quote 생성 (POST /communications/quotes)
   ↓
3. RFQ 생성자가 Quote 확인/수락 (POST /communications/quotes/{id}/accept)
   ↓
4. Quote 생성자가 최종 확정 (POST /communications/quotes/{id}/confirm)
   ↓
5. 체결
```

### RFQ 생성

**POST /communications/rfqs**

| Field | Required | 설명 |
|-------|----------|------|
| `market_ticker` | O | 마켓 |
| `rest_remainder` | O | 미체결분 유지 여부 |
| `contracts` / `contracts_fp` | X | 계약 수 |
| `target_cost_dollars` | X | 목표 비용 |
| `replace_existing` | X | 기존 RFQ 대체 |

- 최대 **100개 동시 RFQ** 유지 가능

### Quote 생성

**POST /communications/quotes**

| Field | Required | 설명 |
|-------|----------|------|
| `rfq_id` | O | 응답할 RFQ ID |
| `yes_bid` | O | YES 매수 호가 (FPD) |
| `no_bid` | O | NO 매수 호가 (FPD) |
| `rest_remainder` | O | 미체결분 유지 여부 |

### 기타 엔드포인트
- GET /communications/rfqs — RFQ 목록
- GET /communications/rfqs/{id} — RFQ 상세
- DELETE /communications/rfqs/{id} — RFQ 삭제
- GET /communications/quotes — Quote 목록
- DELETE /communications/quotes/{id} — Quote 삭제
- POST /communications/quotes/{id}/accept — Quote 수락
- POST /communications/quotes/{id}/confirm — Quote 확정

---

## 3. Multivariate Events (Combos)

여러 이벤트/마켓을 조합한 복합 포지션.

### 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| GET | /multivariate/collections | 컬렉션 목록 |
| GET | /multivariate/collections/{ticker} | 컬렉션 상세 |
| POST | /multivariate/collections/{ticker}/markets | 컬렉션 내 마켓 생성 |
| GET | /multivariate/collections/{ticker}/lookup | 티커 룩업 |
| GET | /multivariate/collections/{ticker}/lookup/history | 룩업 이력 |

### Market 객체의 MVE 필드
- `mve_collection_ticker` — 소속 컬렉션 티커
- `mve_selected_legs[]` — 선택된 legs
  - `event_ticker`, `market_ticker`, `side`
  - `yes_settlement_value_dollars` (정산 후)

### 필터링
GET /markets에서 `mve_filter` 파라미터:
- `only` — 멀티변량 마켓만
- `exclude` — 멀티변량 제외

---

## 4. Subaccounts

최대 32개 서브계좌로 주문/포지션/잔고를 독립 관리.

### 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| POST | /portfolio/subaccounts | 서브계좌 생성 |
| GET | /portfolio/subaccounts/balances | 전체 잔고 |
| POST | /portfolio/subaccounts/transfer | 계좌 간 이체 |

### 사용법
- 대부분의 엔드포인트에 `subaccount` 파라미터 존재
- `0` = primary (기본)
- `1~32` = 서브계좌
- 생략 시 = 전체 (조회) 또는 primary (실행)

---

## 5. Structured Targets

| Method | Path | 설명 |
|--------|------|------|
| GET | /structured-targets | 목록 |
| GET | /structured-targets/{id} | 상세 |

---

## 6. Milestones

마켓에 연결된 중요 이벤트/시점.

| Method | Path | 설명 |
|--------|------|------|
| GET | /milestones | 목록 |
| GET | /milestones/{id} | 상세 |

GET /events에서 `with_milestones=true`로 함께 조회 가능.

---

## 7. Live Data

| Method | Path | 설명 |
|--------|------|------|
| GET | /live-data/{ticker} | 단일 마켓 라이브 데이터 |
| GET | /live-data | 복수 마켓 라이브 데이터 |

---

## 8. Exchange 정보

| Method | Path | 인증 | 설명 |
|--------|------|------|------|
| GET | /exchange/status | X | 거래소 상태 |
| GET | /exchange/schedule | X | 운영 시간 |
| GET | /exchange/announcements | X | 공지사항 |
| GET | /exchange/series-fee-changes | X | 수수료 변경 |
| GET | /exchange/user-data-timestamp | O | 유저 데이터 타임스탬프 |

---

## 9. FIX Protocol

기관투자자용 저지연 프로토콜. 별도 연결.

주요 문서:
- [FIX Overview](https://docs.kalshi.com/fix/index.md)
- [Connectivity](https://docs.kalshi.com/fix/connectivity.md)
- [Session Management](https://docs.kalshi.com/fix/session-management.md)
- [Order Entry](https://docs.kalshi.com/fix/order-entry.md)
- [Order Groups](https://docs.kalshi.com/fix/order-groups.md)
- [RFQ Messages](https://docs.kalshi.com/fix/rfq-messages.md)
- [Drop Copy](https://docs.kalshi.com/fix/drop-copy.md)
- [Error Handling](https://docs.kalshi.com/fix/error-handling.md)
- [Subpenny Pricing](https://docs.kalshi.com/fix/subpenny-pricing.md)

---

## 10. API Keys 관리

| Method | Path | 설명 |
|--------|------|------|
| POST | /api-keys | API Key 생성 |
| POST | /api-keys/generate | API Key 생성 (대체) |
| GET | /api-keys | Key 목록 |
| DELETE | /api-keys/{id} | Key 삭제 |

---

## 11. Account

| Method | Path | 설명 |
|--------|------|------|
| GET | /account/api-limits | API 한도 조회 (현재 tier, 남은 quota 등) |
