"""
손글씨 숫자 인식 앱의 바로가기 아이콘(아이콘.ico)을 만드는 스크립트.

파란 둥근 사각형 위에 손글씨체 숫자 '3'을 얹은 아이콘을 그린다.
윈도우가 요구하는 여러 크기(16~256픽셀)를 한 파일에 모두 담는다.

실행 방법:
    python 아이콘_만들기.py
"""

import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

# 윈도우 콘솔에서 한글이 깨지지 않도록 표준 출력 인코딩을 UTF-8로 맞춘다.
try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

기준폴더 = Path(__file__).resolve().parent
아이콘파일 = 기준폴더 / "아이콘.ico"
# tkinter 의 iconphoto 에 쓸 PNG. .ico 보다 창 아이콘 적용이 확실하다.
아이콘PNG파일 = 기준폴더 / "아이콘.png"

밑그림크기 = 512           # 큰 크기로 그린 뒤 줄여야 가장자리가 매끄럽다.
배경색 = (26, 86, 219)     # 앱에서 쓰는 파란색 (#1a56db)
글자색 = (255, 255, 255)   # 흰색 글씨
그림자색 = (13, 52, 140)   # 배경보다 어두운 파랑 (입체감용)

# 윈도우가 요구하는 아이콘 크기 목록
아이콘크기목록 = [(16, 16), (24, 24), (32, 32), (48, 48),
                  (64, 64), (128, 128), (256, 256)]


def 손글씨폰트_찾기(크기):
    """손글씨 느낌의 폰트를 우선 찾고, 없으면 굵은 기본 폰트로 대체한다."""
    후보목록 = [
        r"C:\Windows\Fonts\segoesc.ttf",   # Segoe Script (손글씨체)
        r"C:\Windows\Fonts\segoepr.ttf",   # Segoe Print (손글씨체)
        r"C:\Windows\Fonts\malgunbd.ttf",  # 맑은 고딕 Bold
        r"C:\Windows\Fonts\segoeuib.ttf",  # Segoe UI Bold
    ]
    for 경로 in 후보목록:
        if Path(경로).exists():
            return ImageFont.truetype(경로, 크기)
    # 어느 것도 없으면 PIL 기본 폰트를 쓴다. (모양은 투박해진다)
    return ImageFont.load_default()


def 아이콘_그리기():
    """512x512 크기의 아이콘 밑그림을 그려서 돌려준다."""
    # RGBA: 마지막 A는 투명도. 모서리 바깥을 투명하게 두기 위해 필요하다.
    밑그림 = Image.new("RGBA", (밑그림크기, 밑그림크기), (0, 0, 0, 0))
    붓 = ImageDraw.Draw(밑그림)

    # 둥근 사각형 배경. 가장자리에 약간 여백을 둔다.
    여백 = 26
    모서리반지름 = 108
    붓.rounded_rectangle(
        [여백, 여백, 밑그림크기 - 여백, 밑그림크기 - 여백],
        radius=모서리반지름, fill=배경색,
    )

    # 손글씨체 숫자 '3'을 한가운데에 그린다.
    글자 = "3"
    폰트 = 손글씨폰트_찾기(330)
    좌, 상, 우, 하 = 붓.textbbox((0, 0), 글자, font=폰트)
    글자너비, 글자높이 = 우 - 좌, 하 - 상
    x = (밑그림크기 - 글자너비) / 2 - 좌
    y = (밑그림크기 - 글자높이) / 2 - 상 - 22  # 밑줄 자리를 비워 두려고 살짝 위로
    붓.text((x, y), 글자, font=폰트, fill=글자색)

    # 글씨 아래에 공책 밑줄처럼 짧은 선을 그어 '손글씨'라는 느낌을 준다.
    밑줄y = 밑그림크기 - 여백 - 74
    밑줄반너비 = 96
    붓.rounded_rectangle(
        [밑그림크기 / 2 - 밑줄반너비, 밑줄y,
         밑그림크기 / 2 + 밑줄반너비, 밑줄y + 20],
        radius=10, fill=그림자색,
    )

    return 밑그림


def main():
    밑그림 = 아이콘_그리기()

    # PIL이 sizes 목록에 맞춰 여러 해상도를 한 .ico 파일에 담아 준다.
    # 바로가기(.lnk)의 아이콘으로 쓰인다.
    밑그림.save(아이콘파일, format="ICO", sizes=아이콘크기목록)

    # tkinter 의 iconphoto 용 PNG. 창과 작업 표시줄 아이콘에 쓰인다.
    밑그림.resize((256, 256), Image.LANCZOS).save(아이콘PNG파일, format="PNG")

    크기목록 = ", ".join(f"{가로}x{세로}" for 가로, 세로 in 아이콘크기목록)
    print(f"아이콘을 만들었습니다: {아이콘파일}")
    print(f"담긴 크기: {크기목록}")
    print(f"창 아이콘용 PNG: {아이콘PNG파일}")


if __name__ == "__main__":
    main()
