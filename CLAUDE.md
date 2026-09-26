# CLAUDE.md (저장소 뿌리)

이 파일은 데스크톱 버전과 웹 버전 **두 갈래에 공통으로** 적용되는 것만 담는다.
각 버전 고유의 내용(빌드 명령, 검증 절차, 폴더 구조상 알아 둘 점)은 해당 폴더의
`CLAUDE.md` 를 본다.

- [`desktop_version/CLAUDE.md`](desktop_version/CLAUDE.md) — tkinter + PyTorch 데스크톱 앱
- [`web_version/CLAUDE.md`](web_version/CLAUDE.md) — 순수 자바스크립트 웹 앱

## 저장소 지도

```
CLAUDE.md, README.md          이 문서들 (공통)
.github/workflows/pages.yml   web_version/ 을 GitHub Pages 로 배포하는 워크플로
desktop_version/               PyTorch 로 학습하고 tkinter GUI 로 인식하는 Windows 앱
  CLAUDE.md, README.md         데스크톱 전용 안내
  model.py                     모델 구조 정의 (숫자인식CNN)
  train.py                     학습 스크립트. mnist_cnn.pt 를 만든다
  app.py                       tkinter 그림판 + 인식 GUI
  mnist_cnn.pt                 학습된 가중치 (모든 가중치의 원본)
  기타                          아이콘, 바로가기, 배치 파일 등 실행 보조 파일
web_version/                   빌드 도구 없이 브라우저에서 바로 도는 웹 앱
  CLAUDE.md, README.md         웹 전용 안내
  index.html, 스타일.css        화면
  js/                          그림판·전처리·순수 자바스크립트 추론 엔진
  모델/                        mnist_cnn.pt 를 내보낸 결과물 (손으로 고치지 않음)
  도구/                        가중치·검증데이터를 만드는 파이썬 스크립트 (빌드 시점에만 실행)
  검증/                        정확도 게이트를 브라우저에서 직접 확인하는 페이지
docs/superpowers/              설계·계획 문서. 이 과제에서 건드리지 않는다
```

## 한글 식별자 규약

**모든 식별자와 주석이 한글이다.** 파이썬 클래스·함수·변수·argparse 인자,
자바스크립트 함수·변수·클래스, CSS 클래스 이름, PowerShell 변수까지 예외 없이 한글로 짓는다.

예외는 세 곳뿐이다.

1. `desktop_version/손글씨앱 실행.bat` — 전체가 ASCII 여야 하는 사정은
   [`desktop_version/CLAUDE.md`](desktop_version/CLAUDE.md) 참고.
2. DOM·표준 API 이름 (`addEventListener`, `getContext`, `fetch` 등) — 언어·플랫폼이 정한 이름이므로 바꾸지 않는다.
3. `.github/workflows/pages.yml` 의 job·step `id` — GitHub Actions 가 `id` 에 영문·숫자·`_`·`-` 만
   허용하기 때문이다. 사람이 읽는 `name` 은 그대로 한글로 쓴다.

## 두 버전이 맞춰야 하는 값들

같은 값이 데스크톱과 웹 양쪽 파일에 따로 적혀 있다. 한쪽만 고치면 조용히 어긋난다.

| 값 | 데스크톱 쪽 | 웹 쪽 |
|---|---|---|
| 정규화 상수 `평균=0.1307`, `표준편차=0.3081` | `desktop_version/train.py`, `desktop_version/app.py` | `web_version/js/전처리.js` |
| 전처리 6단계 (아래 참고) | `desktop_version/app.py` 의 `전처리()` | `web_version/js/전처리.js` 의 `전처리()` |
| 모델 구조 (합성곱 2층 + 전결합 2층) | `desktop_version/model.py` 의 `숫자인식CNN` | `web_version/js/신경망.js` (순전파를 그대로 옮김) + `web_version/js/가중치.js` 의 `기대하는모양` |
| 캔버스 한 변 280, 붓 굵기 22 | `desktop_version/app.py` 의 `캔버스크기`, `펜굵기` | `web_version/js/그림판.js` 의 `캔버스크기`, `펜굵기` |
| 가중치 값 자체 | `desktop_version/mnist_cnn.pt` (원본) | `web_version/모델/mnist_cnn.bin`, `mnist_cnn.json` (내보낸 결과물) |

### 가중치는 한 방향으로만 흐른다

`desktop_version/mnist_cnn.pt` 가 원본이고, `web_version/모델/` 은 거기서
`web_version/도구/가중치_내보내기.py` 로 뽑아낸 결과물이다. 반대 방향은 없다.

**`desktop_version` 에서 재학습했으면 반드시 `python web_version/도구/가중치_내보내기.py`
를 다시 돌려서 웹 쪽 가중치를 갱신해야 한다.** 잊으면 두 버전이 서로 다른 모델로 예측하게 된다.

### 전처리 6단계

280×280(웹은 그린 그대로, 데스크톱도 캔버스 크기가 같다) 그림을 MNIST가 만들어진
절차 그대로 28×28 로 줄인다. 이 순서를 벗어나면 인식률이 떨어진다.

1. 글씨가 있는 영역만 경계상자로 잘라냄
2. 비율을 유지한 채 긴 변을 20px 로 축소 (Lanczos3)
3. 28×28 검은 도화지 한가운데에 붙임
4. 픽셀 무게중심을 정확히 (13.5, 13.5) 로 정수 평행 이동
5. 0~255 값을 0~1 로 변환
6. `(값 - 0.1307) / 0.3081` 로 정규화

## 정확도 기준

**MNIST 평가 앞 200장 중 190장 이상(190/200)** 을 맞히면 통과다. 데스크톱과 웹
양쪽 모두 이 기준을 지켜야 하며, 현재 둘 다 199/200 이다(모델 자체의 전체 평가
정확도는 99.07%). 모델이나 전처리를 건드린 뒤에는 반드시 이 게이트를 다시 확인한다.

## 인코딩 표

파일 종류마다 인코딩 요구가 다르고, 틀리면 조용히 깨지거나 실행이 실패한다.

| 파일 | 요구 |
|---|---|
| `*.py`, `*.js`, `*.html`, `*.css`, `*.md` | UTF-8 |
| `*.ps1` | UTF-8 **+ BOM** |
| `*.bat` | **ASCII 전용 + CRLF** |

파이썬 출력을 파이프로 받을 때는 `PYTHONIOENCODING=utf-8` 을 붙여야 한글이 깨지지 않는다.

## 함부로 하지 말 것

- 파일 연결(`assoc`/`ftype`) 등록은 시스템 설정 변경이다. 사용자가 명시적으로 요청할 때만 한다.
- 전체 화면 캡처는 사용자의 다른 창 내용까지 담는다. 검증이 필요하면 앱 창 영역만 캡처한다.
- `web_version/모델/` 을 손으로 고치지 않는다. `web_version/도구/가중치_내보내기.py` 의
  결과물이므로, 바꾸고 싶으면 원본(`desktop_version/mnist_cnn.pt`)을 재학습하고 다시 내보낸다.
