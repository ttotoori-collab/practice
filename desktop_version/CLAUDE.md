# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

MNIST CNN을 학습시키고, tkinter 그림판에 마우스로 쓴 숫자를 인식하는 Windows 데스크톱 앱.
git 저장소가 아니며 테스트 스위트, 린터, 패키지 매니페스트가 없다.

## 명령어

```bash
python train.py                 # 학습 (기본 5 에폭) -> mnist_cnn.pt 저장
python train.py --에폭 10       # 에폭 지정. --배치크기 --학습률 --시드 도 한글 인자
python app.py                   # 손글씨 인식 GUI 실행
python 아이콘_만들기.py          # 아이콘.ico / 아이콘.png 재생성
powershell -ExecutionPolicy Bypass -File .\바로가기_만들기.ps1   # 바탕화면+폴더 바로가기 재생성
```

출력을 파이프로 받을 때는 `PYTHONIOENCODING=utf-8` 을 붙여야 한글이 깨지지 않는다.
학습은 CPU에서 에폭당 약 3분 30초 걸린다. 백그라운드로 돌리고 로그를 지켜보는 편이 낫다.

환경: Python 3.14, torch 2.14.0+cpu (CPU 전용 빌드), torchvision, Pillow, numpy.

## 변경 후 검증하는 법

테스트가 없으므로, 모델이나 전처리를 건드렸으면 MNIST 평가 이미지를 `app.py` 의
전처리 경로에 그대로 통과시켜 확인한다. 정상이면 190/200 이상 나온다.

```python
from torchvision import datasets
from PIL import Image
from app import 전처리, 모델_불러오기
import torch
모델 = 모델_불러오기(torch.device('cpu'))
평가셋 = datasets.MNIST('data', train=False, download=False)
맞힘 = sum(int(모델(전처리(원본.resize((280, 280), Image.LANCZOS))).argmax(1)) == 정답
           for 원본, 정답 in (평가셋[i] for i in range(200)))
print(맞힘)
```

GUI 변경은 `pythonw.exe` 로 띄운 뒤 프로세스와 `MainWindowTitle` 이 뜨는지로 확인한다.
콘솔이 없어 예외가 화면에 안 나오므로, `app.py` 의 `오류창()` 이 잡아 주는 경로를 믿지 말고
개발 중에는 `python app.py` (콘솔 있는 쪽)로 실행해 예외를 직접 본다.

## 코드 규약

**모든 식별자와 주석이 한글이다.** 클래스(`숫자인식CNN`, `손글씨앱`), 함수(`전처리`,
`한_에폭_학습`), 지역 변수, argparse 인자(`--에폭`), PowerShell 변수(`$앱식별자`)까지.
새 코드도 이 규약을 따른다. 유일한 예외는 `손글씨앱 실행.bat` (아래 인코딩 항목 참고).

## 인코딩 제약 (실수하기 쉬움)

파일 종류마다 인코딩 요구가 다르고, 틀리면 조용히 깨지거나 실행이 실패한다.

| 파일 | 요구 | 어기면 |
|---|---|---|
| `*.py` | UTF-8 | — (Python 3 기본값) |
| `*.ps1` | UTF-8 **+ BOM** | PowerShell 5.1이 CP949로 읽어 파싱 오류 |
| `*.bat` | **ASCII 전용** | cmd가 바이트 위치를 잃고 명령이 쪼개짐 |

`.bat` 에 한글을 넣으려는 시도는 CP949 / UTF-8 / `chcp 65001` 세 가지 모두 실패가 확인됐다.
이 파일만 영문 주석으로 두고 한글 설명은 README에 있다. 되돌리지 말 것.

`.ps1` 을 Write 도구로 만들면 BOM이 붙지 않으므로, 저장 후 BOM을 넣어 줘야 한다:

```powershell
$내용 = [System.IO.File]::ReadAllText($경로, (New-Object System.Text.UTF8Encoding $false))
[System.IO.File]::WriteAllText($경로, $내용, (New-Object System.Text.UTF8Encoding $true))
```

## 파일 간에 맞춰야 하는 값들

여러 파일에 같은 값이 흩어져 있고, 어긋나면 조용히 오작동한다.

- **정규화 상수** `평균=0.1307`, `표준편차=0.3081` — `train.py` 와 `app.py` 양쪽에 있다.
  다르면 학습은 잘 되는데 앱 인식률만 망가진다.
- **앱 식별자** `DSMP.MNIST.HandwritingRecognizer` — `app.py` 의 `앱식별자` 와
  `바로가기_만들기.ps1` 의 `$앱식별자`. 다르면 작업 표시줄 고정이 동작하지 않는다.
- **`model.py` 의 모델 구조** — `train.py` 와 `app.py` 가 공유한다.
  구조를 바꾸면 기존 `mnist_cnn.pt` 를 못 읽으므로 반드시 재학습해야 한다.

## 구조상 알아 둘 점

**`app.py` 의 `전처리()` 가 인식률의 핵심이다.** 280×280 그림을 28×28로 그냥 줄이면
인식률이 크게 떨어진다. MNIST가 만들어진 절차(글씨 영역 crop → 긴 변 20px로 축소 →
28×28 중앙 배치 → 픽셀 무게중심을 (13.5, 13.5)로 평행 이동)를 그대로 재현하고 있다.
이 함수를 단순화하려는 시도는 정확도를 떨어뜨린다.

**캔버스는 이중으로 그린다.** tkinter Canvas(화면용)와 PIL Image(인식용)에 같은 획을
동시에 그린다. tkinter Canvas는 픽셀을 되읽을 수 없기 때문이다. 그리기 관련 코드를
고칠 때 두 쪽 모두 갱신해야 한다.

**`train.py` 는 평가 정확도가 최고일 때만 저장한다.** 마지막 에폭 가중치가 아니다.

**실행 경로:** 바탕화면 `.lnk` → `pythonw.exe`(콘솔 없음) → `app.py`.
`바로가기_만들기.ps1` 은 `WScript.Shell` 대신 COM(`IShellLink`/`IPropertyStore`)을 직접
쓴다. AppUserModelID를 심어야 작업 표시줄 고정이 되는데 `WScript.Shell` 로는 불가능해서다.
또 `C:\...\Microsoft\WindowsApps\` 의 Microsoft Store 별칭 스텁(0바이트)을 걸러내고
`py -0p` 가 알려주는 실제 설치 경로를 우선한다.

## 함부로 하지 말 것

- 파일 연결(`assoc`/`ftype`) 등록은 시스템 설정 변경이다. 사용자가 명시적으로 요청할 때만 한다.
  README에 수동 등록 방법이 적혀 있다.
- 전체 화면 캡처는 사용자의 다른 창 내용까지 담는다. 검증이 필요하면 `PrintWindow` 로
  앱 창 영역만 캡처한다.
