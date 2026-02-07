# WebSocket API — 상세 레퍼런스

← [핵심 레퍼런스로 돌아가기](../kalshi-api-core.md#9-websocket-api)

---

## 접속

### Endpoints
| 환경 | URL |
|------|-----|
| Production | `wss://api.elections.kalshi.com/trade-api/ws/v2` |
| Demo | `wss://demo-api.kalshi.co/trade-api/ws/v2` |

### 인증
핸드셰이크 시 HTTP 헤더로 전달:
```
KALSHI-ACCESS-KEY: {api_key_id}
KALSHI-ACCESS-TIMESTAMP: {timestamp_ms}
KALSHI-ACCESS-SIGNATURE: {signature}
```

서명 메시지:
```
{timestamp}GET/trade-api/ws/v2
```

> 모든 채널(공개 포함)에 접속하려면 인증이 필요함. 단일 WebSocket 연결로 모든 채널 사용.

---

## Keep-Alive

- 서버가 **10초마다** Ping 프레임 (0x9, body: `heartbeat`) 전송
- 클라이언트는 Pong 프레임 (0xA)으로 응답
- 양방향: 클라이언트도 Ping 보낼 수 있고 서버가 Pong 응답

---

## 명령어 형식

### Subscribe
```json
{
  "id": 1,
  "cmd": "subscribe",
  "params": {
    "channels": ["ticker", "orderbook_delta"],
    "market_ticker": "MARKET-TICKER"
  }
}
```

### Unsubscribe
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

### 파라미터 옵션
- `market_ticker`: 단일 마켓
- `market_tickers`: 복수 마켓 (배열)
- 생략: 모든 마켓 수신
- `market_id` / `market_ids`: 일부 채널에서 사용 불가 (orderbook_delta 등)

---

## 채널 상세

### ticker (공개)
실시간 가격/거래량 업데이트. 필드 변경 시마다 전송.

- market_ticker 생략 가능 (모든 마켓)
- `market_id`/`market_ids`도 지원

### ticker_v2 (공개)
델타 기반 경량 업데이트. **변경된 필드만** 포함.

- 전체 스냅샷이 아닌 변경분만 수신
- 캐시된 상태에 델타 적용하는 방식으로 사용
- market_ticker 생략 가능

### trade (공개)
체결 발생 시 알림.

- market_ticker 생략 가능
- 체결 직후 전송

### market_lifecycle_v2 (공개)
마켓 상태 변경 알림 (active → closed 등).

### orderbook_delta (인증 필수)
오더북 실시간 업데이트.

1. 구독 시 `orderbook_snapshot` (전체 스냅샷) 수신
2. 이후 `orderbook_delta` (변경분) 수신
3. 변경분을 로컬 오더북에 적용

- `market_ticker` 또는 `market_tickers` 사용 (필수)
- `market_id`/`market_ids` 미지원

### fill (인증 필수)
내 주문 체결 알림.

- **market_ticker 무시됨** — 항상 모든 마켓의 내 체결 수신
- 즉시 알림

### market_positions (인증 필수)
내 포지션 실시간 업데이트.

- market_ticker 생략 가능 (전체 포지션)
- `market_id`/`market_ids` 미지원
- 금액은 **centi-cents** (1/10,000 달러) 단위
  - 달러 환산: value / 10000

### communications (인증 필수)
RFQ/Quote 관련 알림.

### order_group_updates (인증 필수)
Order Group 상태 변경 알림.

### multivariate (공개)
멀티변량 이벤트 업데이트.

---

## 메시지 타입

| type | 설명 |
|------|------|
| `subscribed` | 구독 확인 |
| `unsubscribed` | 구독 해제 확인 |
| `ticker` | 가격/거래량 업데이트 |
| `orderbook_snapshot` | 오더북 전체 |
| `orderbook_delta` | 오더북 변경분 |
| `trade` | 공개 체결 |
| `fill` | 내 체결 |
| `error` | 에러 |

---

## 에러 코드

| Code | 의미 |
|------|------|
| 9 | 인증 필요 (private 채널) |
| 16 | 마켓 없음 |
| 19~22 | Shard 관련 파라미터 에러 |

---

## Python 접속 예시

```python
import asyncio
import websockets
import json

async def connect():
    timestamp = str(int(time.time() * 1000))
    signature = sign_request(private_key, timestamp, "GET", "/trade-api/ws/v2")

    headers = {
        "KALSHI-ACCESS-KEY": api_key_id,
        "KALSHI-ACCESS-TIMESTAMP": timestamp,
        "KALSHI-ACCESS-SIGNATURE": signature,
    }

    async with websockets.connect(
        "wss://api.elections.kalshi.com/trade-api/ws/v2",
        extra_headers=headers
    ) as ws:
        # 구독
        await ws.send(json.dumps({
            "id": 1,
            "cmd": "subscribe",
            "params": {
                "channels": ["ticker"],
                "market_ticker": "MARKET-TICKER"
            }
        }))

        # 메시지 수신
        async for message in ws:
            data = json.loads(message)
            print(data)

asyncio.run(connect())
```
