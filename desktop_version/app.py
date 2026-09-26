"""
마우스로 숫자를 직접 써서 인식하는 손글씨 숫자 인식 앱 (tkinter GUI).

실행 방법:
    python app.py

필요한 파일:
    mnist_cnn.pt  (train.py 로 먼저 학습해서 만들어 둔 가중치 파일)
"""

import sys
import tkinter as tk
from tkinter import messagebox
from pathlib import Path

import numpy as np
import torch
from PIL import Image, ImageDraw

from model import 숫자인식CNN

# 윈도우 콘솔에서 한글이 깨지지 않도록 표준 출력 인코딩을 UTF-8로 맞춘다.
try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

기준폴더 = Path(__file__).resolve().parent
가중치파일 = 기준폴더 / "mnist_cnn.pt"
아이콘파일 = 기준폴더 / "아이콘.ico"
아이콘PNG파일 = 기준폴더 / "아이콘.png"

# 윈도우가 이 프로그램을 pythonw.exe 가 아니라 독립된 앱으로 인식하게 하는 식별자.
# 바로가기에도 똑같은 값을 심어 두면, 실행 중인 창과 작업 표시줄에 고정한 아이콘이
# 하나로 묶여서 올바른 아이콘과 이름으로 표시된다.
앱식별자 = "DSMP.MNIST.HandwritingRecognizer"

캔버스크기 = 280      # 그림판 한 변의 픽셀 크기 (28의 10배)
펜굵기 = 22           # 붓 굵기. MNIST 글씨 두께와 비슷해지도록 잡았다.
평균 = 0.1307         # 학습할 때 사용한 정규화 평균
표준편차 = 0.3081     # 학습할 때 사용한 정규화 표준편차


def 앱식별자_등록():
    """
    윈도우 작업 표시줄이 이 프로그램을 독립된 앱으로 다루도록 식별자를 등록한다.

    이 과정을 건너뛰면 실행 중인 창이 'pythonw.exe' 로 묶여서,
    작업 표시줄에 고정해도 파이썬 기본 아이콘이 뜨고 고정한 항목을 눌러도
    앱이 실행되지 않는다. 윈도우가 아닌 환경에서는 조용히 넘어간다.
    """
    if sys.platform != "win32":
        return
    try:
        import ctypes
        ctypes.windll.shell32.SetCurrentProcessExplicitAppUserModelID(앱식별자)
    except Exception:
        # 식별자 등록에 실패해도 앱 자체는 정상 동작하므로 무시한다.
        pass


def 창아이콘_지정(루트):
    """
    창 왼쪽 위와 작업 표시줄에 표시될 아이콘을 지정한다.

    두 가지 방법을 함께 쓴다.
      - iconphoto(PNG): 창과 작업 표시줄 아이콘을 확실하게 바꿔 준다.
      - iconbitmap(ICO): 제목 표시줄의 작은 아이콘까지 챙겨 준다.
    둘 중 하나가 실패해도 나머지가 적용되도록 따로 감싼다.
    """
    # PhotoImage 는 참조가 사라지면 이미지가 해제되므로 루트에 붙들어 둔다.
    if 아이콘PNG파일.exists():
        try:
            루트._아이콘이미지 = tk.PhotoImage(file=str(아이콘PNG파일))
            루트.iconphoto(True, 루트._아이콘이미지)
        except Exception:
            pass

    if 아이콘파일.exists():
        try:
            루트.iconbitmap(default=str(아이콘파일))
        except Exception:
            # 아이콘 적용에 실패해도 앱 자체는 정상 동작하므로 무시한다.
            pass


def 모델_불러오기(장치):
    """저장된 가중치를 읽어 평가 모드의 모델을 돌려준다."""
    if not 가중치파일.exists():
        raise FileNotFoundError(
            f"가중치 파일을 찾을 수 없습니다: {가중치파일}\n"
            "먼저 'python train.py' 를 실행해 모델을 학습시켜 주세요."
        )
    모델 = 숫자인식CNN().to(장치)
    모델.load_state_dict(torch.load(가중치파일, map_location=장치))
    모델.eval()
    return 모델


def 전처리(그림):
    """
    사용자가 그린 280x280 그림을 MNIST 형식(28x28, 가운데 정렬)으로 변환한다.

    MNIST는 숫자를 20x20 상자에 맞춘 뒤 무게중심을 28x28 이미지의 중앙에 두는
    방식으로 만들어졌으므로, 같은 규칙을 따라야 인식률이 높아진다.
    아무것도 그리지 않았으면 None 을 돌려준다.
    """
    경계 = 그림.getbbox()  # 글씨가 있는 영역(흰색 부분)의 사각형 범위
    if 경계 is None:
        return None

    잘라낸그림 = 그림.crop(경계)
    너비, 높이 = 잘라낸그림.size

    # 긴 변이 20픽셀이 되도록 비율을 유지하며 축소한다.
    비율 = 20.0 / max(너비, 높이)
    새너비 = max(1, int(round(너비 * 비율)))
    새높이 = max(1, int(round(높이 * 비율)))
    축소그림 = 잘라낸그림.resize((새너비, 새높이), Image.LANCZOS)

    # 28x28 검은 도화지 한가운데에 붙인다.
    도화지 = Image.new("L", (28, 28), 0)
    도화지.paste(축소그림, ((28 - 새너비) // 2, (28 - 새높이) // 2))

    # 픽셀 값의 무게중심을 계산해 정확히 중앙(13.5, 13.5)으로 평행 이동한다.
    배열 = np.array(도화지, dtype=np.float32)
    총합 = 배열.sum()
    if 총합 > 0:
        세로좌표, 가로좌표 = np.indices(배열.shape)
        중심y = (세로좌표 * 배열).sum() / 총합
        중심x = (가로좌표 * 배열).sum() / 총합
        이동x = int(round(13.5 - 중심x))
        이동y = int(round(13.5 - 중심y))
        도화지 = Image.fromarray(배열.astype(np.uint8)).transform(
            (28, 28), Image.AFFINE, (1, 0, -이동x, 0, 1, -이동y), fillcolor=0
        )

    # 0~255 값을 0~1로 바꾼 뒤 학습 때와 동일하게 정규화한다.
    텐서 = torch.from_numpy(np.array(도화지, dtype=np.float32) / 255.0)
    텐서 = (텐서 - 평균) / 표준편차
    return 텐서.view(1, 1, 28, 28)  # (배치, 채널, 높이, 너비)


class 손글씨앱:
    """그림판과 인식 결과 화면을 담당하는 GUI 클래스."""

    def __init__(self, 루트, 모델, 장치):
        self.루트 = 루트
        self.모델 = 모델
        self.장치 = 장치
        self.이전좌표 = None

        루트.title("손글씨 숫자 인식기")
        루트.resizable(False, False)

        전체틀 = tk.Frame(루트, padx=12, pady=12, bg="#f4f4f4")
        전체틀.pack()

        # ---------- 왼쪽: 그림판 ----------
        왼쪽틀 = tk.Frame(전체틀, bg="#f4f4f4")
        왼쪽틀.grid(row=0, column=0, sticky="n")

        tk.Label(왼쪽틀, text="여기에 숫자를 써 보세요 (0~9)",
                 font=("맑은 고딕", 11), bg="#f4f4f4").pack(pady=(0, 6))

        self.캔버스 = tk.Canvas(왼쪽틀, width=캔버스크기, height=캔버스크기,
                                bg="black", cursor="cross", highlightthickness=1,
                                highlightbackground="#888888")
        self.캔버스.pack()

        # 화면에 보이는 그림과 똑같은 내용을 PIL 이미지에도 그려 두고, 인식할 때 사용한다.
        self.그림 = Image.new("L", (캔버스크기, 캔버스크기), 0)
        self.붓 = ImageDraw.Draw(self.그림)

        # 마우스 이벤트 연결
        self.캔버스.bind("<Button-1>", self.그리기시작)
        self.캔버스.bind("<B1-Motion>", self.그리는중)
        self.캔버스.bind("<ButtonRelease-1>", self.그리기끝)

        버튼틀 = tk.Frame(왼쪽틀, bg="#f4f4f4")
        버튼틀.pack(pady=(10, 0), fill="x")
        tk.Button(버튼틀, text="인식하기", font=("맑은 고딕", 10, "bold"),
                  width=12, command=self.인식하기).pack(side="left", expand=True)
        tk.Button(버튼틀, text="지우기", font=("맑은 고딕", 10),
                  width=12, command=self.지우기).pack(side="right", expand=True)

        # ---------- 오른쪽: 인식 결과 ----------
        오른쪽틀 = tk.Frame(전체틀, padx=16, bg="#f4f4f4")
        오른쪽틀.grid(row=0, column=1, sticky="n")

        tk.Label(오른쪽틀, text="인식 결과", font=("맑은 고딕", 11),
                 bg="#f4f4f4").pack()
        self.결과라벨 = tk.Label(오른쪽틀, text="?", font=("맑은 고딕", 72, "bold"),
                                 fg="#1a56db", bg="#f4f4f4")
        self.결과라벨.pack(pady=(0, 4))
        self.확신라벨 = tk.Label(오른쪽틀, text="숫자를 써 주세요",
                                 font=("맑은 고딕", 10), fg="#555555", bg="#f4f4f4")
        self.확신라벨.pack(pady=(0, 10))

        # 0~9 각각의 확률을 막대그래프로 보여 준다.
        self.확률막대 = []
        self.확률글자 = []
        표틀 = tk.Frame(오른쪽틀, bg="#f4f4f4")
        표틀.pack()
        for 숫자 in range(10):
            tk.Label(표틀, text=str(숫자), font=("맑은 고딕", 10), width=2,
                     bg="#f4f4f4").grid(row=숫자, column=0)
            막대캔버스 = tk.Canvas(표틀, width=140, height=14, bg="#e2e2e2",
                                   highlightthickness=0)
            막대캔버스.grid(row=숫자, column=1, pady=1)
            막대 = 막대캔버스.create_rectangle(0, 0, 0, 14, fill="#1a56db", width=0)
            글자 = tk.Label(표틀, text="0.0%", font=("맑은 고딕", 9), width=6,
                            anchor="e", fg="#555555", bg="#f4f4f4")
            글자.grid(row=숫자, column=2, padx=(6, 0))
            self.확률막대.append((막대캔버스, 막대))
            self.확률글자.append(글자)

        tk.Label(오른쪽틀, text="붓을 떼면 자동으로 인식합니다.",
                 font=("맑은 고딕", 9), fg="#777777", bg="#f4f4f4").pack(pady=(10, 0))

    # ---------- 그리기 관련 ----------
    def 그리기시작(self, 이벤트):
        """마우스 버튼을 누른 순간의 위치를 기억하고 점을 하나 찍는다."""
        self.이전좌표 = (이벤트.x, 이벤트.y)
        반지름 = 펜굵기 / 2
        self.캔버스.create_oval(이벤트.x - 반지름, 이벤트.y - 반지름,
                                이벤트.x + 반지름, 이벤트.y + 반지름,
                                fill="white", outline="white")
        self.붓.ellipse([이벤트.x - 반지름, 이벤트.y - 반지름,
                         이벤트.x + 반지름, 이벤트.y + 반지름], fill=255)

    def 그리는중(self, 이벤트):
        """마우스를 끄는 동안 이전 좌표와 현재 좌표를 선으로 잇는다."""
        if self.이전좌표 is None:
            return
        현재좌표 = (이벤트.x, 이벤트.y)
        # 화면용 캔버스에 그리기
        self.캔버스.create_line(self.이전좌표[0], self.이전좌표[1],
                                현재좌표[0], 현재좌표[1], fill="white",
                                width=펜굵기, capstyle=tk.ROUND, smooth=True)
        # 인식용 PIL 이미지에도 똑같이 그리기
        self.붓.line([self.이전좌표, 현재좌표], fill=255, width=펜굵기, joint="curve")
        self.이전좌표 = 현재좌표

    def 그리기끝(self, _이벤트):
        """붓을 떼면 자동으로 인식을 수행한다."""
        self.이전좌표 = None
        self.인식하기()

    def 지우기(self):
        """그림판과 인식 결과를 모두 초기화한다."""
        self.캔버스.delete("all")
        self.붓.rectangle([0, 0, 캔버스크기, 캔버스크기], fill=0)
        self.결과라벨.config(text="?")
        self.확신라벨.config(text="숫자를 써 주세요")
        for 숫자 in range(10):
            막대캔버스, 막대 = self.확률막대[숫자]
            막대캔버스.coords(막대, 0, 0, 0, 14)
            self.확률글자[숫자].config(text="0.0%")

    # ---------- 인식 관련 ----------
    def 인식하기(self):
        """현재 그려진 글씨를 모델에 넣어 숫자를 예측하고 화면을 갱신한다."""
        입력텐서 = 전처리(self.그림)
        if 입력텐서 is None:
            self.확신라벨.config(text="먼저 숫자를 써 주세요")
            return

        with torch.no_grad():
            출력 = self.모델(입력텐서.to(self.장치))
            확률 = torch.exp(출력)[0].cpu().numpy()  # 로그 소프트맥스 -> 확률

        예측숫자 = int(확률.argmax())
        self.결과라벨.config(text=str(예측숫자))
        self.확신라벨.config(text=f"확신도 {확률[예측숫자] * 100:.1f}%")

        # 막대그래프 갱신
        for 숫자 in range(10):
            막대캔버스, 막대 = self.확률막대[숫자]
            길이 = float(확률[숫자]) * 140
            색 = "#1a56db" if 숫자 == 예측숫자 else "#9aa5b1"
            막대캔버스.coords(막대, 0, 0, 길이, 14)
            막대캔버스.itemconfig(막대, fill=색)
            self.확률글자[숫자].config(text=f"{확률[숫자] * 100:.1f}%")

        print(f"인식 결과: {예측숫자} (확신도 {확률[예측숫자] * 100:.1f}%)", flush=True)


def 오류창(제목, 내용):
    """콘솔 없이 더블클릭으로 실행된 경우에도 오류를 볼 수 있도록 경고창을 띄운다."""
    임시창 = tk.Tk()
    임시창.withdraw()
    messagebox.showerror(제목, 내용)
    임시창.destroy()


def main():
    # tk 창을 만들기 전에 등록해야 작업 표시줄에 제대로 반영된다.
    앱식별자_등록()

    장치 = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    try:
        모델 = 모델_불러오기(장치)
    except FileNotFoundError as 오류:
        오류창("가중치 파일 없음", str(오류))
        return

    루트 = tk.Tk()
    창아이콘_지정(루트)
    손글씨앱(루트, 모델, 장치)
    루트.mainloop()


if __name__ == "__main__":
    # 더블클릭 실행 시에는 콘솔이 없어 오류 메시지가 그냥 사라진다.
    # 예기치 못한 오류도 창으로 보여 주어 원인을 알 수 있게 한다.
    try:
        main()
    except Exception:
        import traceback
        오류창("예기치 못한 오류", traceback.format_exc())
