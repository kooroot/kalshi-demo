# SDK 사용법 — 상세 레퍼런스

← [핵심 레퍼런스로 돌아가기](../kalshi-api-core.md#10-sdk-사용법)

---

## Python SDK

### 설치

```bash
# 동기 (일반 사용)
pip install kalshi_python_sync

# 비동기 (고성능, asyncio)
pip install kalshi_python_async
```

> `kalshi-python` 패키지는 **deprecated** — 반드시 마이그레이션

- PyPI (sync): https://pypi.org/project/kalshi_python_sync/
- PyPI (async): https://pypi.org/project/kalshi_python_async/

### 기본 설정

```python
from kalshi_python_sync import Configuration, KalshiClient

config = Configuration(
    host="https://api.elections.kalshi.com/trade-api/v2"
)

# Private Key 로드
with open("private_key.pem", "r") as f:
    private_key = f.read()

config.api_key_id = "your-api-key-id"
config.private_key_pem = private_key

client = KalshiClient(config)
```

### Demo 환경 사용

```python
config = Configuration(
    host="https://demo-api.kalshi.co/trade-api/v2"
)
```

### 주요 API 클래스

| 클래스 | 용도 |
|--------|------|
| `MarketsApi` | 마켓/시리즈/오더북/체결 조회 |
| `EventsApi` | 이벤트 조회 |
| `PortfolioApi` | 주문/잔고/포지션/체결/정산 |
| `ExchangeApi` | 거래소 상태/일정 |
| `ApiKeysApi` | API Key 관리 |
| `CommunicationsApi` | RFQ/Quote |
| `MilestonesApi` | 마일스톤 |
| `MultivariateCollectionsApi` | 멀티변량 |
| `SeriesApi` | 시리즈 |
| `StructuredTargetsApi` | 구조화 타겟 |

### 사용 예시

```python
# 잔고 조회
balance = client.get_balance()
print(f"Balance: ${balance.balance / 100:.2f}")

# 마켓 목록
markets = client.get_markets(status="open", limit=10)
for m in markets.markets:
    print(f"{m.ticker}: YES={m.yes_bid_dollars} / NO={m.no_bid_dollars}")

# 이벤트 조회
events = client.get_events(status="open", with_nested_markets=True)

# 오더북
orderbook = client.get_market_orderbook(ticker="MARKET-TICKER")

# 주문 생성
order = client.create_order(
    ticker="MARKET-TICKER",
    action="buy",
    side="yes",
    type="limit",
    count=1,
    yes_price=42,
    client_order_id="unique-uuid"
)

# 주문 조회
orders = client.get_orders(status="resting")

# 주문 취소
client.cancel_order(order_id="order-id")

# 포지션 조회
positions = client.get_positions()

# 체결 내역
fills = client.get_fills(limit=50)
```

---

## TypeScript SDK

### 설치

```bash
npm install kalshi-typescript
```

### 주요 API 클래스

Python SDK와 동일한 구조:
- `MarketsApi`, `EventsApi`, `PortfolioApi`, `ExchangeApi`
- `ApiKeysApi`, `CommunicationsApi`, `MilestonesApi`
- `MultivariateCollectionsApi`, `SeriesApi`, `StructuredTargetsApi`

### 퀵스타트
- 공식 문서: https://docs.kalshi.com/sdks/typescript/quickstart

---

## SDK 공통 사항

### 인증
- API Key ID + PEM Private Key 파일 필요
- SDK가 자동으로 서명 생성/헤더 설정

### 업데이트 주기
- OpenAPI spec에 맞춰 릴리스
- 보통 화~수요일에 새 버전 게시

### OpenAPI Spec
- URL: https://docs.kalshi.com/openapi.yaml
- 직접 코드 생성도 가능

### AsyncAPI Spec
- WebSocket용 스펙
- URL: https://docs.kalshi.com 에서 확인

---

## SDK 없이 직접 구현 (참고)

### 인증 없는 요청 (공개 데이터)
```python
import requests

BASE = "https://api.elections.kalshi.com/trade-api/v2"
resp = requests.get(f"{BASE}/markets", params={"status": "open", "limit": 5})
markets = resp.json()["markets"]
```

### 인증 요청 (직접 서명)
```python
import requests, base64, time
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding

def get_auth_headers(key_id, private_key_pem, method, path):
    ts = str(int(time.time() * 1000))
    pk = serialization.load_pem_private_key(private_key_pem.encode(), None)
    msg = f"{ts}{method}{path}".encode()
    sig = pk.sign(msg, padding.PSS(
        mgf=padding.MGF1(hashes.SHA256()),
        salt_length=padding.PSS.MAX_LENGTH
    ), hashes.SHA256())
    return {
        "KALSHI-ACCESS-KEY": key_id,
        "KALSHI-ACCESS-TIMESTAMP": ts,
        "KALSHI-ACCESS-SIGNATURE": base64.b64encode(sig).decode(),
    }

# 사용
headers = get_auth_headers(KEY_ID, PRIVATE_KEY, "GET", "/trade-api/v2/portfolio/balance")
resp = requests.get(f"{BASE}/portfolio/balance", headers=headers)
print(resp.json())
```
