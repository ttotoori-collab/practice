"""
학습된 PyTorch 가중치(mnist_cnn.pt)를 웹 버전이 읽을 수 있는 형식으로 내보낸다.

웹 버전은 외부 라이브러리 없이 동작해야 하므로 PyTorch 파일을 직접 읽을 수 없다.
그래서 텐서를 Float32 리틀엔디언 바이너리 한 덩어리로 이어 붙이고,
각 텐서의 이름·모양·시작 위치를 JSON 목록에 적어 둔다.
"""

import json
import struct
import sys
from pathlib import Path

import torch

기준폴더 = Path(__file__).resolve().parent.parent      # web_version/
저장소폴더 = 기준폴더.parent
가중치파일 = 저장소폴더 / "desktop_version" / "mnist_cnn.pt"
내보낼폴더 = 기준폴더 / "모델"

# 순서를 고정해야 바이너리가 재현 가능하다. js 쪽은 이름으로 찾으므로 순서에 의존하지 않는다.
텐서순서 = [
    "합성곱1.weight", "합성곱1.bias",
    "합성곱2.weight", "합성곱2.bias",
    "전결합1.weight", "전결합1.bias",
    "전결합2.weight", "전결합2.bias",
]


def 내보내기():
    if not 가중치파일.exists():
        print(f"가중치 파일이 없습니다: {가중치파일}", file=sys.stderr)
        print("먼저 desktop_version 에서 'python train.py' 를 실행해 주세요.", file=sys.stderr)
        return 1

    상태 = torch.load(가중치파일, map_location="cpu")

    빠진키 = [이름 for 이름 in 텐서순서 if 이름 not in 상태]
    if 빠진키:
        print(f"가중치에 다음 텐서가 없습니다: {빠진키}", file=sys.stderr)
        print("model.py 의 구조와 텐서순서 목록이 어긋난 것입니다.", file=sys.stderr)
        return 1

    남은키 = [이름 for 이름 in 상태 if 이름 not in 텐서순서]
    if 남은키:
        print(f"경고: 내보내지 않는 텐서가 있습니다: {남은키}", file=sys.stderr)

    내보낼폴더.mkdir(parents=True, exist_ok=True)
    이진파일 = 내보낼폴더 / "mnist_cnn.bin"
    목록파일 = 내보낼폴더 / "mnist_cnn.json"

    텐서목록 = []
    시작바이트 = 0
    with open(이진파일, "wb") as 파일:
        for 이름 in 텐서순서:
            값 = 상태[이름].detach().cpu().contiguous().to(torch.float32)
            평탄 = 값.flatten().tolist()
            # '<' 는 리틀엔디언, 'f' 는 4바이트 float. 자바스크립트 Float32Array 와 같다.
            파일.write(struct.pack(f"<{len(평탄)}f", *평탄))
            텐서목록.append({
                "이름": 이름,
                "모양": list(값.shape),
                "시작바이트": 시작바이트,
                "개수": len(평탄),
            })
            print(f"  {이름:<20} 모양={list(값.shape)} 개수={len(평탄)}")
            시작바이트 += len(평탄) * 4

    목록 = {
        "설명": "숫자인식CNN 가중치. 텐서를 C 순서로 평탄화해 이어 붙인 Float32 바이너리.",
        "자료형": "float32",
        "바이트순서": "little",
        "본문파일": "mnist_cnn.bin",
        "전체바이트": 시작바이트,
        "텐서": 텐서목록,
    }
    목록파일.write_text(json.dumps(목록, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(f"\n{이진파일.name}  {시작바이트:,} 바이트 ({시작바이트 / 1024 / 1024:.2f} MB)")
    print(f"{목록파일.name}  텐서 {len(텐서목록)}개")
    return 0


if __name__ == "__main__":
    sys.exit(내보내기())
