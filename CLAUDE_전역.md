# CLAUDE.md (전역)

모든 프로젝트에 공통으로 적용되는 지침.

## 시각 처리

시각은 **대한민국 표준시(KST, UTC+9)** 를 기준으로 한다.

- 사용자에게 날짜·시각을 말할 때는 KST로 환산해서 말한다.
- 코드에서 현재 시각을 다룰 때는 시간대를 명시한다. 나이브 datetime을 쓰지 않는다.

```python
from datetime import datetime, timezone, timedelta

한국시간대 = timezone(timedelta(hours=9))
현재 = datetime.now(한국시간대)
```

Python 3.9 이상이면 `zoneinfo` 를 쓰는 편이 낫다.

```python
from zoneinfo import ZoneInfo
현재 = datetime.now(ZoneInfo("Asia/Seoul"))
```

- 로그 타임스탬프, 파일 이름의 날짜, 커밋 메시지의 날짜도 KST 기준으로 적는다.
- 외부 API나 DB가 UTC를 반환하면 저장은 UTC로 두되, **표시할 때 KST로 변환**한다.
- 상대적 표현("어제", "지난주")은 KST 기준으로 해석하고, 기록에 남길 때는 절대 날짜로 바꾼다.
