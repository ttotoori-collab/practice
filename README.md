# 손글씨 숫자 인식기 (MNIST)

마우스나 손가락으로 쓴 숫자를 인식하는 프로그램입니다.
같은 CNN 모델을 **웹 버전**과 **Windows 데스크톱 버전** 두 가지로 제공합니다.

MNIST 평가 정확도는 **99.07%** 이고, 두 버전 모두 앞 200장 기준 **199/200** 을 맞힙니다.

**웹 버전은 설치 없이 바로 써 볼 수 있습니다 → <https://ttotoori-collab.github.io/practice/>**

## 어느 쪽을 쓸까

| | [웹 버전](web_version/) | [데스크톱 버전](desktop_version/) |
|---|---|---|
| 설치 | 필요 없음 (브라우저만) | Python + PyTorch |
| 입력 | 마우스 · 터치 · 펜 | 마우스 |
| 추론 | 순수 자바스크립트 (외부 라이브러리 0개) | PyTorch |
| 학습 | 불가 | `train.py` 로 재학습 가능 |
| 배포 | GitHub Pages 정적 배포 | 바탕화면 바로가기 |

가중치는 한 방향으로만 흐릅니다. **데스크톱에서 학습 → 변환 → 웹이 사용.**

## 빠른 시작

### 웹 버전

```bash
python -m http.server 8765 --directory web_version
```

<http://localhost:8765/> 에 접속합니다.
(`file://` 로 직접 열면 `fetch` 가 막혀 모델을 읽지 못합니다.)

### 데스크톱 버전

```bash
cd desktop_version
pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
pip install pillow numpy
python app.py
```

학습된 가중치가 저장소에 들어 있어서 바로 실행됩니다.

## 폴더 구성

```
├── web_version/       순수 자바스크립트 웹 앱
├── desktop_version/   PyTorch + tkinter 데스크톱 앱 (학습 담당)
├── docs/              설계 문서
└── .github/workflows/ web_version 을 GitHub Pages 로 배포
```

자세한 설명은 각 폴더의 README 를 보세요.

## 인식률의 핵심: 전처리

그림을 28×28 로 그냥 줄이면 인식률이 크게 떨어집니다.
그래서 두 버전 모두 MNIST 가 만들어진 절차를 그대로 재현합니다.

1. 글씨가 있는 영역만 잘라내기
2. 비율을 유지한 채 긴 변을 20px 로 축소 (Lanczos3)
3. 28×28 도화지 가운데에 배치
4. 픽셀 무게중심을 정확히 중앙(13.5, 13.5)으로 평행 이동
5. 학습 때와 같은 정규화 `(값/255 - 0.1307) / 0.3081`

웹 버전은 이 축소 필터를 canvas 의 `drawImage` 에 맡기지 않고 직접 구현했습니다.
`drawImage` 의 리샘플링은 브라우저마다 결과가 달라 데스크톱과 인식 결과가 어긋나기
때문입니다. 실제로 두 구현의 전처리 출력은 156,800 픽셀 중 10 픽셀만 1/255 차이가 납니다.

## 모델

```
입력 28×28×1
  → 합성곱 3×3 (1→32)  → ReLU → 최대풀링 2×2   →  14×14×32
  → 합성곱 3×3 (32→64) → ReLU → 최대풀링 2×2   →   7×7×64
  → 평탄화 3136 → 전결합 128 → ReLU → 전결합 10 → 로그 소프트맥스
```

학습 가능한 파라미터는 약 42만 개, 가중치 파일은 1.6MB 입니다.

## 코드 규약

**모든 식별자와 주석이 한글입니다.** 파이썬 클래스·함수, PowerShell 변수,
자바스크립트 함수·변수, CSS 클래스 이름까지 포함합니다.

예외는 언어나 플랫폼이 한글을 받지 못하는 자리뿐입니다
(배치 파일 전체, 표준 API 이름, GitHub Actions 의 `id`).
이유는 [CLAUDE.md](CLAUDE.md) 에 적어 두었습니다.

## GitHub Pages 배포

`main` 브랜치의 `web_version/` 이 바뀌면 자동으로 배포됩니다.
처음 한 번은 **Settings → Pages → Source** 를 `GitHub Actions` 로 지정해야 합니다.
