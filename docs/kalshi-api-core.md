# Kalshi API 핵심 레퍼런스

> Kalshi는 미국 CFTC 규제를 받는 이벤트 거래소(event exchange)로, 현실 세계 이벤트의 결과를 예측하여 거래하는 플랫폼이다.

---

## 목차

1. [핵심 개념 (용어)](#1-핵심-개념)
2. [환경 & Base URL](#2-환경--base-url)
3. [인증 (Authentication)](#3-인증-authentication)
4. [Rate Limits](#4-rate-limits)
5. [데이터 포맷 규칙](#5-데이터-포맷-규칙)
6. [Market Data (시장 조회)](#6-market-data-시장-조회)
7. [Orders (주문)](#7-orders-주문)
8. [Portfolio (포트폴리오)](#8-portfolio-포트폴리오)
9. [WebSocket API](#9-websocket-api)
10. [SDK 사용법](#10-sdk-사용법)
11. [고급 기능](#11-고급-기능)

---

## 1. 핵심 개념

| 용어 | 설명 |
|------|------|
| **Market** | 단일 바이너리 마켓. YES/NO 두 가지 결과에 베팅. 가격은 0~1달러 (확률 반영) |
| **Event** | 마켓들의 모음. 유저가 상호작용하는 기본 단위. 예: "2월 고용 보고서" |
| **Series** | 관련 이벤트들의 반복 모음. 예: "월간 고용 보고서" 시리즈 |
| **Ticker** | 각 Market/Event/Series의 고유 식별자 |
| **Contract** | 1개의 거래 단위. YES 또는 NO 포지션 |
| **Settlement** | 마켓 결과 확정 후 정산. YES가 맞으면 1달러, 틀리면 0달러 |
| **Orderbook** | YES/NO 각각의 매수 호가 목록 |
| **Fill** | 주문이 체결된 것 |
| **Resting Order** | 오더북에 올라가 있는 미체결 주문 |

### Market 상태 흐름
```
initialized → inactive → active → closed → determined → finalized
                                     ↓
                                  disputed → amended
```

### 가격 이해
- YES 가격 + NO 가격 = $1.00 (항상)
- YES가 $0.42이면 → 시장이 해당 이벤트의 확률을 42%로 보고 있다는 뜻
- YES 매수 @ $0.42 → 맞으면 $1.00 받음 (수익 $0.58), 틀리면 $0.42 손실

---

## 2. 환경 & Base URL

| 환경 | API Base URL | Web UI |
|------|-------------|--------|
| **Production** | `https://api.elections.kalshi.com/trade-api/v2` | `https://kalshi.com` |
| **Demo** | `https://demo-api.kalshi.co/trade-api/v2` | `https://demo.kalshi.co` |

> `api.elections.kalshi.com`은 elections 서브도메인이지만 **모든 마켓** (경제, 날씨, 스포츠 등)에 접근 가능

- Demo 환경은 가상 자금으로 테스트 가능
- **인증 정보는 prod/demo 간 공유되지 않음** — 별도 가입 필요

---

## 3. 인증 (Authentication)

### API Key 생성
1. kalshi.com → Account & Security → API Keys
2. RSA Private Key 다운로드 + Key ID 확인
3. **Private Key는 최초 1회만 확인 가능** — 반드시 안전하게 보관

### 인증 헤더 (3개)

| Header | 값 |
|--------|------|
| `KALSHI-ACCESS-KEY` | API Key ID (UUID) |
| `KALSHI-ACCESS-TIMESTAMP` | 현재 시각 (밀리초 단위 Unix timestamp) |
| `KALSHI-ACCESS-SIGNATURE` | RSA-PSS 서명 (base64) |

### 서명 생성 방법

```
message = timestamp + method + path
```
- **path에 query parameter 포함하지 않음!**
  - O: `/trade-api/v2/portfolio/orders`
  - X: `/trade-api/v2/portfolio/orders?limit=5`

**Python 예시:**
```python
import base64, time
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding

def sign_request(private_key_pem: str, timestamp: str, method: str, path: str) -> str:
    private_key = serialization.load_pem_private_key(
        private_key_pem.encode(), password=None
    )
    message = f"{timestamp}{method}{path}".encode()
    signature = private_key.sign(
        message,
        padding.PSS(
            mgf=padding.MGF1(hashes.SHA256()),
            salt_length=padding.PSS.MAX_LENGTH
        ),
        hashes.SHA256()
    )
    return base64.b64encode(signature).decode()

# 사용
timestamp = str(int(time.time() * 1000))
signature = sign_request(private_key_pem, timestamp, "GET", "/trade-api/v2/portfolio/balance")
headers = {
    "KALSHI-ACCESS-KEY": api_key_id,
    "KALSHI-ACCESS-TIMESTAMP": timestamp,
    "KALSHI-ACCESS-SIGNATURE": signature,
}
```

**JavaScript 예시:**
```javascript
const crypto = require('crypto');

function signRequest(privateKeyPem, timestamp, method, path) {
  const message = `${timestamp}${method}${path}`;
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(message);
  return sign.sign({
    key: privateKeyPem,
    padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
    saltLength: crypto.constants.RSA_PSS_SALTLEN_MAX_LENGTH
  }, 'base64');
}
```

---

## 4. Rate Limits

| Tier | Read (초당) | Write (초당) | 자격 조건 |
|------|-----------|------------|----------|
| **Basic** | 20 | 10 | 가입만 하면 됨 |
| **Advanced** | 30 | 30 | 별도 신청서 제출 |
| **Premier** | 100 | 100 | 월간 거래량 3.75% + 기술심사 |
| **Prime** | 400 | 400 | 월간 거래량 7.5% + 기술심사 |

**Write로 카운트되는 엔드포인트:**
- CreateOrder, CancelOrder, AmendOrder, DecreaseOrder
- BatchCreateOrders (배치 내 각 주문 = 1건)
- BatchCancelOrders (각 취소 = 0.2건)

---

## 5. 데이터 포맷 규칙

### 가격: FixedPointDollars
- 문자열, 소수점 4자리: `"0.5600"`
- 레거시 정수(cents) 필드는 deprecated → `*_dollars` 필드 사용 권장

### 수량: FixedPointCount
- 문자열, 소수점 2자리: `"10.00"`
- 요청 시 0~2자리 허용, 응답은 항상 2자리
- 현재는 정수 단위만 가능, **2026-02-26 이후 분수 주문 지원 예정**
- 레거시 `count` 정수 필드는 **2026-02-19 제거 예정** → `count_fp` 사용

### Pagination (커서 기반)
```
GET /markets?limit=100           ← 첫 페이지
GET /markets?cursor={token}&limit=100  ← 다음 페이지
```
- `cursor`가 `null`이면 마지막 페이지
- limit: 1~100 (기본 100), 일부 엔드포인트는 최대 1000

---

## 6. Market Data (시장 조회)

> 공개 엔드포인트 — 인증 불필요 (일부 제외)

### 6.1 시리즈 조회

**GET /series/{series_ticker}**
```bash
curl "https://api.elections.kalshi.com/trade-api/v2/series/KXHIGHNY"
```
응답: `ticker`, `frequency`, `title`, `category`, `tags`, `fee_type`, `fee_multiplier`

**GET /series** — 시리즈 목록
- Query: `category`, `tags`, `include_volume`

### 6.2 이벤트 조회

**GET /events** — 이벤트 목록
- Query: `status` (open/closed/settled), `series_ticker`, `with_nested_markets`, `with_milestones`, `limit` (max 200)

**GET /events/{event_ticker}** — 단일 이벤트
- `with_nested_markets=true`로 하위 마켓 포함 가능
- 응답: `event_ticker`, `series_ticker`, `title`, `category`, `mutually_exclusive`, `markets[]`

### 6.3 마켓 조회

**GET /markets** — 마켓 목록
- Query params:
  - `event_ticker` (쉼표로 최대 10개)
  - `series_ticker`
  - `status`: unopened / open / paused / closed / settled
  - `tickers`: 특정 마켓 티커들 (쉼표 구분)
  - `limit`: 1~1000 (기본 100)
  - 시간 필터: `min_close_ts`, `max_close_ts`, `min_settled_ts` 등
  - `mve_filter`: only / exclude (멀티변량 이벤트 필터)

**GET /markets/{ticker}** — 단일 마켓 상세

주요 응답 필드:
```
ticker, event_ticker, market_type (binary/scalar)
status: initialized|inactive|active|closed|determined|finalized
yes_bid_dollars, yes_ask_dollars    ← 현재 최우선 호가
no_bid_dollars, no_ask_dollars
last_price_dollars                   ← 최근 체결가
volume_fp, volume_24h_fp            ← 거래량
open_interest_fp                     ← 미결제약정
result: yes|no|scalar|""            ← 정산 결과 (확정 후)
rules_primary, rules_secondary      ← 마켓 규칙
can_close_early                      ← 조기 종료 가능 여부
```

### 6.4 오더북 조회

**GET /markets/{ticker}/orderbook**
- Query: `depth` (0=전체, 1~100)
- 응답에 `orderbook_fp` 사용 권장 (레거시 `orderbook`은 deprecated)

```json
{
  "orderbook_fp": {
    "yes_dollars": [["0.4000", "50.00"], ["0.4100", "30.00"]],
    "no_dollars":  [["0.5800", "40.00"], ["0.5900", "20.00"]]
  }
}
```

**호가 이해:**
- 배열은 가격 오름차순, **마지막 요소가 최우선 호가(best bid)**
- YES bid @ $0.42 = NO ask @ $0.58 (합이 항상 $1.00)
- Spread = best YES ask - best YES bid

### 6.5 체결 내역 (공개)

**GET /markets/trades**
- Query: `ticker`, `min_ts`, `max_ts`, `limit` (max 1000)
- 응답: `trade_id`, `ticker`, `yes_price_dollars`, `no_price_dollars`, `count_fp`, `taker_side`, `created_time`

### 6.6 캔들스틱

**GET /series/{series_ticker}/markets/{ticker}/candlesticks**
- Query (필수): `start_ts`, `end_ts`, `period_interval` (1분/60분/1440분)
- 응답: OHLC (yes_bid, yes_ask, price) + volume + open_interest

→ 상세: [details/market-data.md](details/market-data.md)

---

## 7. Orders (주문)

> 모든 주문 엔드포인트는 **인증 필수**

### 7.1 주문 생성

**POST /portfolio/orders**

```json
{
  "ticker": "MARKET-TICKER",
  "action": "buy",           // buy | sell
  "side": "yes",             // yes | no
  "type": "limit",           // limit | market
  "count_fp": "10.00",       // 계약 수
  "yes_price_dollars": "0.4200",  // 가격 (달러)
  "client_order_id": "uuid-here", // 중복 방지용 UUID
  "time_in_force": "good_till_canceled",  // fill_or_kill | good_till_canceled | immediate_or_cancel
  "post_only": false,         // true면 maker만
  "reduce_only": false,       // true면 포지션 줄이기만
  "cancel_order_on_pause": false  // 거래 일시중지 시 자동 취소
}
```

**주요 필드 설명:**
- `client_order_id`: 네트워크 오류 시 재전송해도 중복 주문 방지 (409 반환)
- `yes_price_dollars` 또는 `no_price_dollars` 중 하나만 지정
- `buy_max_cost`: 최대 비용 제한 (cents) — Fill-or-Kill 활성화
- `self_trade_prevention_type`: `taker_at_cross` | `maker`
- `subaccount`: 0(기본) ~ 32(서브계좌)
- 유저당 최대 **200,000개** 오픈 주문

**응답:** Order 객체 (order_id, status, fill_count_fp, remaining_count_fp 등)

### 7.2 주문 조회

**GET /portfolio/orders**
- Query: `ticker`, `event_ticker`, `status` (resting/canceled/executed), `limit` (max 200)
- 페이지네이션: cursor 기반

**GET /portfolio/orders/{order_id}** — 단일 주문

### 7.3 주문 수정

**POST /portfolio/orders/{order_id}/amend**
- 가격과 수량 모두 변경 가능
- `updated_client_order_id`로 새 client ID 지정 가능

### 7.4 주문 수량 감소

**POST /portfolio/orders/{order_id}/decrease**
- `reduce_by` / `reduce_by_fp`: N개 만큼 줄이기
- `reduce_to` / `reduce_to_fp`: N개로 맞추기
- 둘 중 하나만 사용

### 7.5 주문 취소

**DELETE /portfolio/orders/{order_id}**
- 완전 삭제가 아닌 "remaining을 0으로" 처리
- 부분 체결된 주문도 남은 부분만 취소

### 7.6 배치 주문

**POST /portfolio/orders/batched** — 다건 생성 (최대 20개/배치)
**POST /portfolio/orders/batched/cancel** — 다건 취소

→ 상세: [details/orders-advanced.md](details/orders-advanced.md)

---

## 8. Portfolio (포트폴리오)

### 8.1 잔고 조회

**GET /portfolio/balance**
```json
{
  "balance": 50000,           // 가용 잔고 (cents)
  "portfolio_value": 120000,  // 포트폴리오 가치 (cents)
  "updated_ts": 1703123456789
}
```

### 8.2 포지션 조회

**GET /portfolio/positions**
- Query: `ticker`, `event_ticker`, `count_filter` (position/total_traded)

응답에 두 가지 뷰:
- **market_positions[]**: 마켓별 `position`, `total_traded`, `market_exposure`, `realized_pnl`, `fees_paid`
- **event_positions[]**: 이벤트별 `total_cost`, `event_exposure`, `realized_pnl`

### 8.3 체결 내역 (내 것)

**GET /portfolio/fills**
- Query: `ticker`, `order_id`, `min_ts`, `max_ts`, `limit` (max 200)
- 응답: `fill_id`, `trade_id`, `order_id`, `side`, `action`, `yes_price_dollars`, `count_fp`, `is_taker`, `fee_cost`

### 8.4 정산 내역

**GET /portfolio/settlements**
- 응답: `ticker`, `market_result` (yes/no/scalar/void), `yes_count_fp`, `no_count_fp`, `revenue`, `settled_time`

→ 상세: [details/portfolio.md](details/portfolio.md)

---

## 9. WebSocket API

### 접속 정보

| 환경 | URL |
|------|-----|
| Production | `wss://api.elections.kalshi.com/trade-api/ws/v2` |
| Demo | `wss://demo-api.kalshi.co/trade-api/ws/v2` |

**인증:** 핸드셰이크 시 동일한 3개 헤더 필요
```
서명 message = timestamp + "GET" + "/trade-api/ws/v2"
```

### Keep-Alive
- 서버가 **10초마다** Ping 프레임 (`heartbeat`) 전송
- 클라이언트는 Pong으로 응답해야 함

### 채널 종류

| 채널 | 인증 | 설명 |
|------|------|------|
| `ticker` | X | 실시간 가격/거래량 업데이트 |
| `ticker_v2` | X | 델타 기반 경량 업데이트 (변경된 필드만) |
| `trade` | X | 공개 체결 알림 |
| `market_lifecycle_v2` | X | 마켓 상태 변경 |
| `orderbook_delta` | O | 오더북 스냅샷 + 증분 업데이트 |
| `fill` | O | 내 주문 체결 알림 (모든 마켓) |
| `market_positions` | O | 내 포지션 실시간 업데이트 |
| `communications` | O | RFQ/Quote 알림 |
| `order_group_updates` | O | Order Group 상태 |
| `multivariate` | X | 멀티변량 이벤트 |

### 구독 메시지

```json
{
  "id": 1,
  "cmd": "subscribe",
  "params": {
    "channels": ["ticker"],
    "market_ticker": "MARKET-TICKER"
  }
}
```

- `market_ticker` 생략 시 모든 마켓 수신
- 복수 마켓: `"market_tickers": ["TICKER1", "TICKER2"]`

### 주요 메시지 타입

| type | 내용 |
|------|------|
| `subscribed` | 구독 확인 |
| `ticker` | 가격/거래량 업데이트 |
| `orderbook_snapshot` | 오더북 전체 스냅샷 |
| `orderbook_delta` | 오더북 변경분 |
| `trade` | 체결 발생 |
| `fill` | 내 주문 체결 |
| `error` | 에러 (code 9=인증필요, 16=마켓없음) |

### 구독 해제
```json
{
  "id": 2,
  "cmd": "unsubscribe",
  "params": {
    "channels": ["ticker"],
    "market_ticker": "MARKET-TICKER"
  }
}
```

→ 상세: [details/websocket.md](details/websocket.md)

---

## 10. SDK 사용법

### Python SDK

```bash
# 동기 버전
pip install kalshi_python_sync

# 비동기 버전
pip install kalshi_python_async
```

> `kalshi-python` (구 패키지)는 deprecated

```python
from kalshi_python_sync import Configuration, KalshiClient

config = Configuration(
    host="https://api.elections.kalshi.com/trade-api/v2"
)

with open("private_key.pem", "r") as f:
    private_key = f.read()

config.api_key_id = "your-api-key-id"
config.private_key_pem = private_key

client = KalshiClient(config)

# 잔고 조회
balance = client.get_balance()
print(f"Balance: ${balance.balance / 100:.2f}")

# 마켓 조회
markets = client.get_markets(status="open", limit=10)

# 주문 생성
order = client.create_order(
    ticker="MARKET-TICKER",
    action="buy",
    side="yes",
    type="limit",
    count=1,
    yes_price=42
)
```

### TypeScript SDK

```bash
npm install kalshi-typescript
```

→ 상세: [details/sdk.md](details/sdk.md)

---

## 11. 고급 기능

### 11.1 Order Groups
- 15초 롤링 윈도우 내 체결 계약 수 제한
- 한도 도달 시 그룹 내 모든 주문 자동 취소
- `POST /portfolio/order_groups/create` → `order_group_id` 발급
- 주문 생성 시 `order_group_id` 포함

### 11.2 RFQ (Request for Quote)
- 대량 거래 시 상대방에게 호가 요청
- 최대 100개 동시 RFQ 유지 가능
- 흐름: RFQ 생성 → Quote 수신 → Quote 수락 → 체결

### 11.3 Multivariate Events (Combos)
- 여러 이벤트를 조합한 복합 포지션
- `mve_collection_ticker`로 식별
- 별도 엔드포인트: `/multivariate/*`

### 11.4 Subaccounts
- 최대 32개 서브계좌 (0=기본, 1~32)
- 주문/포지션을 계좌별로 분리 관리
- `subaccount` 파라미터로 지정

### 11.5 Exchange 상태

**GET /exchange/status** (인증 불필요)
```json
{
  "exchange_active": true,
  "trading_active": true
}
```

**GET /exchange/schedule** — 운영 시간 및 점검 윈도우

→ 상세: [details/advanced-features.md](details/advanced-features.md)

---

## 빠른 참조 — 주요 엔드포인트 요약

### Public (인증 불필요)
| Method | Path | 용도 |
|--------|------|------|
| GET | /markets | 마켓 목록 |
| GET | /markets/{ticker} | 마켓 상세 |
| GET | /markets/{ticker}/orderbook | 오더북 |
| GET | /markets/trades | 공개 체결 |
| GET | /events | 이벤트 목록 |
| GET | /events/{event_ticker} | 이벤트 상세 |
| GET | /series/{series_ticker} | 시리즈 상세 |
| GET | /series | 시리즈 목록 |
| GET | /exchange/status | 거래소 상태 |
| GET | /exchange/schedule | 운영 시간 |

### Private (인증 필수)
| Method | Path | 용도 |
|--------|------|------|
| POST | /portfolio/orders | 주문 생성 |
| GET | /portfolio/orders | 주문 목록 |
| POST | /portfolio/orders/{id}/amend | 주문 수정 |
| POST | /portfolio/orders/{id}/decrease | 수량 감소 |
| DELETE | /portfolio/orders/{id} | 주문 취소 |
| POST | /portfolio/orders/batched | 배치 주문 |
| GET | /portfolio/balance | 잔고 |
| GET | /portfolio/positions | 포지션 |
| GET | /portfolio/fills | 내 체결 |
| GET | /portfolio/settlements | 정산 내역 |

---

## 공통 에러 코드

| HTTP | 의미 |
|------|------|
| 400 | Bad Request — 잘못된 파라미터 |
| 401 | Unauthorized — 인증 실패 |
| 404 | Not Found |
| 409 | Conflict — 중복 client_order_id 등 |
| 429 | Rate Limit 초과 |
| 500 | Internal Server Error |

---

*원본 문서: https://docs.kalshi.com*
*API 버전: 3.6.0*
*최종 업데이트: 2026-02-03*
