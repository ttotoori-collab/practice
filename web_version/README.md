# 손글씨 숫자 인식기 — 웹 버전

브라우저 안에서만 동작하는 MNIST 손글씨 숫자 인식기입니다. 외부 라이브러리, CDN,
번들러, `package.json` 이 전혀 없고, 추론까지 전부 순수 자바스크립트로 되어 있습니다.
같은 모델을 쓰는 데스크톱 버전(Windows, PyTorch + tkinter)은
[`../desktop_version/`](../desktop_version/) 에 있습니다.

## 실행 방법

브라우저의 `fetch` 는 `file://` 로 직접 열면 막히므로, 간단한 웹 서버로 열어야 합니다.

```bash
python -m http.server 8765 --directory web_version
```

(저장소 뿌리에서 실행하는 경우의 경로입니다. 이미 `web_version` 폴더 안에 있다면
`--directory` 없이 `python -m http.server 8765` 만 실행하면 됩니다.)

그다음 브라우저로 `http://localhost:8765/` 를 엽니다. 포트 8765 가 이미 다른
프로세스에서 쓰이고 있으면 아무 빈 포트 번호로 바꾸면 됩니다.

## 파일 목록

| 파일 | 설명 |
|---|---|
| `index.html`, `스타일.css` | 화면 뼈대와 스타일 |
| `js/그림판.js` | 캔버스에 획을 그리고 흑백 픽셀로 되읽음 (마우스·터치·펜 공용) |
| `js/전처리.js` | MNIST 전처리 6단계 + Lanczos3 리샘플링 재구현 |
| `js/신경망.js` | 합성곱·최대풀링·전결합·로그소프트맥스로 이루어진 순수 자바스크립트 추론 엔진 |
| `js/가중치.js` | `모델/` 의 바이너리·JSON 을 텐서 이름으로 찾을 수 있게 정리하고 모양을 검사 |
| `js/앱.js` | 화면과 추론을 잇는 조립 모듈 |
| `모델/mnist_cnn.bin` | 내보낸 가중치 본문 (약 1.61MB, 1,686,568 바이트) |
| `모델/mnist_cnn.json` | 가중치 텐서 이름·모양·위치 목록 |
| `도구/가중치_내보내기.py` | `desktop_version/mnist_cnn.pt` → `모델/` 변환 스크립트 (빌드 시점) |
| `도구/평가데이터_만들기.py` | `검증/평가데이터.bin` 생성 스크립트 (빌드 시점) |
| `검증/검증.html` | 브라우저에서 정확도 게이트를 직접 확인하는 페이지 |
| `검증/평가데이터.bin` | MNIST 평가 앞 200장을 담은 바이너리 |

## 정확도

`검증/검증.html` 을 열면 MNIST 평가 앞 200장을 브라우저 안에서 직접 추론해
점수를 보여 줍니다.

- 합격 기준: **190/200 이상**
- 현재: **199/200** (틀리는 항목은 데스크톱 버전과 똑같이 43번 이미지 하나, 2를 4로 오인식)

## 데스크톱 버전과의 차이

| | 데스크톱 | 웹 |
|---|---|---|
| 추론 엔진 | PyTorch | 순수 자바스크립트 (`js/신경망.js`) |
| 캔버스 | tkinter Canvas + PIL Image 이중 그리기 | Canvas 하나 (`getImageData()` 로 직접 되읽음) |
| 입력 방식 | 마우스만 | 마우스·터치·펜 (포인터 이벤트) |
| 리샘플링 구현 | PIL 의 `Image.resize(..., Image.LANCZOS)` | 직접 구현한 Lanczos3 (`js/전처리.js`) |
| 학습 | 여기서 함 | 하지 않음. 데스크톱이 학습한 가중치를 내보내 씀 |
| 전처리·정규화 상수 차이 | — | 156,800 픽셀 중 10 픽셀만 1/255 차이 (합격 기준에 영향 없음) |

## 가중치 재내보내기

`desktop_version` 에서 모델을 재학습했으면 웹 쪽 가중치도 다시 만들어야 합니다.

```bash
python web_version/도구/가중치_내보내기.py
```

`desktop_version/mnist_cnn.pt` 를 읽어 `web_version/모델/mnist_cnn.bin` 과
`mnist_cnn.json` 을 새로 씁니다. 입력이 그대로면 출력 바이트도 그대로입니다.

평가 데이터를 다시 만들려면 (보통은 필요 없습니다. `desktop_version/data` 의
MNIST 원본이 바뀌지 않는 한 항상 같은 200장이 나옵니다):

```bash
python web_version/도구/평가데이터_만들기.py
```

## GitHub Pages 배포

`.github/workflows/pages.yml` 이 `main` 브랜치에서 이 폴더(`web_version/`)가 바뀔
때마다 자동으로 `web_version/` 전체를 GitHub Pages 에 올립니다. 저장소 설정에서
한 번만 켜 주면 됩니다.

```
Settings → Pages → Build and deployment → Source 를 "GitHub Actions" 로
```

이 저장소는 GitHub Pages 의 프로젝트 사이트(`사용자.github.io/저장소/`) 아래에서
서비스되므로, `index.html` 을 비롯한 모든 파일이 절대 경로(`/` 로 시작하는 경로)가
아니라 상대 경로로 서로를 참조합니다.

## 축소 필터를 직접 구현한 이유

MNIST 데이터셋은 원본 손글씨 이미지를 긴 변 20px 로 줄일 때 Lanczos 필터를 씁니다.
브라우저가 기본으로 제공하는 이미지 축소(`<canvas>` 의 `drawImage`, CSS
`image-rendering` 등)는 구현체마다 필터 종류와 계수가 달라서 PIL 의 Lanczos 결과를
정확히 재현한다는 보장이 없습니다. 축소 방식이 조금만 달라도 안티에일리어싱 결과가
달라져서 인식률이 떨어집니다.

그래서 `js/전처리.js` 가 Lanczos3 커널(지지 반경 3)을 직접 계산하고, PIL 과 같은
방식으로 가로축·세로축을 분리해 순서대로 적용합니다. 이 덕분에 데스크톱(PIL)과 웹의
전처리 결과가 156,800 픽셀 중 10 픽셀만 1/255 차이가 나는 수준으로 거의 같아졌고,
정확도 게이트(199/200)도 데스크톱과 동일하게 맞출 수 있었습니다.
