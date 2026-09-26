# 손글씨 숫자 인식기 (MNIST)

마우스·터치·펜으로 숫자를 하나 써서 0~9 를 인식하는 프로그램입니다.
같은 모델을 두 가지 방식으로 씁니다.

- **데스크톱 버전** — PyTorch 로 학습하고 tkinter 그림판으로 인식하는 Windows 앱
- **웹 버전** — 외부 라이브러리 없이 순수 자바스크립트로 브라우저에서 바로 도는 앱

학습된 모델의 MNIST 평가 정확도는 **99.07%** 입니다.

## 두 버전 비교

| | 데스크톱 버전 | 웹 버전 |
|---|---|---|
| 실행 환경 | Windows, Python + PyTorch | 아무 브라우저 (서버는 정적 파일 호스팅만) |
| 추론 엔진 | PyTorch | 순수 자바스크립트로 재구현 |
| 학습 | 여기서 함 (`train.py`) | 하지 않음. 데스크톱이 만든 가중치를 내보내 씀 |
| 그림판 | tkinter Canvas + PIL Image 이중 그리기 | Canvas 하나 (포인터 이벤트로 마우스·터치·펜 공용) |
| 정확도 게이트 (평가 앞 200장) | 199/200 | 199/200 |
| 폴더 | [`desktop_version/`](desktop_version/) | [`web_version/`](web_version/) |
| 문서 | [`desktop_version/README.md`](desktop_version/README.md) | [`web_version/README.md`](web_version/README.md) |

## 빠른 시작

**데스크톱 버전**

```bash
cd desktop_version
pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
pip install pillow numpy
python app.py
```

**웹 버전** (학습된 가중치가 이미 `web_version/모델/` 에 들어 있어 바로 실행됩니다)

```bash
python -m http.server 8765 --directory web_version
```

그다음 `http://localhost:8765/` 를 엽니다.

각 버전을 직접 학습·수정하려면 해당 폴더의 README 와 CLAUDE.md 를 봅니다.

## 인식률을 위한 전처리

화면의 그림을 그냥 28×28 로 줄이면 인식률이 크게 떨어집니다. 그래서 두 버전 모두
MNIST 가 만들어진 절차를 그대로 재현합니다.

1. 글씨가 있는 영역만 경계상자로 잘라냄
2. 비율을 유지한 채 긴 변을 20px 로 축소 (Lanczos3)
3. 28×28 검은 도화지 한가운데에 붙임
4. 픽셀 무게중심을 정확히 (13.5, 13.5) 로 정수 평행 이동
5. 0~255 값을 0~1 로 변환
6. `(값 - 0.1307) / 0.3081` 로 정규화

데스크톱은 `desktop_version/app.py` 의 `전처리()`, 웹은 `web_version/js/전처리.js` 의
`전처리()` 가 같은 절차를 구현합니다. 두 구현의 차이는 156,800 픽셀(평가 200장 × 784) 중
10 픽셀이 1/255 만큼 다른 정도로 작습니다.

## 모델 구조

```
입력 (1, 28, 28)
  → 합성곱 1→32채널, 3×3, 여백 1 → 렐루 → 최대풀링 2×2   (32, 14, 14)
  → 합성곱 32→64채널, 3×3, 여백 1 → 렐루 → 최대풀링 2×2  (64, 7, 7)
  → 평탄화 (3136)
  → 전결합 3136→128 → 렐루
  → 전결합 128→10
  → 로그소프트맥스
```

학습 가능한 파라미터는 약 42만 개입니다. 데스크톱은 `desktop_version/model.py` 의
`숫자인식CNN` 클래스로, 웹은 `web_version/js/신경망.js` 의 순전파 재구현으로 같은 구조를
씁니다. 원본 가중치는 `desktop_version/mnist_cnn.pt` 하나뿐이고, 웹의
`web_version/모델/mnist_cnn.bin`(약 1.61MB) 은 거기서 `web_version/도구/가중치_내보내기.py`
로 내보낸 결과물입니다.

## 코드 규약

모든 식별자와 주석은 한글입니다. 예외는 `desktop_version/손글씨앱 실행.bat`(ASCII 전용),
DOM·표준 API 이름, `.github/workflows/pages.yml` 의 job·step `id`(GitHub 규칙상 영문만
허용) 세 곳뿐입니다. 두 버전이 맞춰야 하는 값들과 인코딩 규칙은
[`CLAUDE.md`](CLAUDE.md) 에 정리되어 있습니다.

## GitHub Pages 배포

`.github/workflows/pages.yml` 이 `main` 브랜치에서 `web_version/` 이 바뀔 때마다
자동으로 GitHub Pages 에 배포합니다. 저장소 설정에서 **한 번만** 켜 주면 됩니다.

```
Settings → Pages → Build and deployment → Source 를 "GitHub Actions" 로
```

배포 주소는 저장소 설정에 따라 정해지므로 여기 적어 두지 않습니다.
자세한 내용은 [`web_version/README.md`](web_version/README.md) 를 봅니다.
