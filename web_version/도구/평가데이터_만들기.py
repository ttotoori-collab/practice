"""
웹 버전 검증 페이지가 쓸 MNIST 평가 이미지를 바이너리로 뽑는다.

파일 형식 (리틀엔디언):
    [0..4)            개수 (uint32)
    [4..4+개수)       정답 라벨 (uint8 각 1바이트)
    [4+개수..)        이미지 (한 장당 28*28 = 784 바이트, 행 우선, 0=검정)
"""

import struct
import sys
from pathlib import Path

import numpy as np
from torchvision import datasets

기준폴더 = Path(__file__).resolve().parent.parent
저장소폴더 = 기준폴더.parent
데이터폴더 = 저장소폴더 / "desktop_version" / "data"
내보낼파일 = 기준폴더 / "검증" / "평가데이터.bin"

개수 = 200


def 만들기():
    if not 데이터폴더.exists():
        print(f"MNIST 데이터 폴더가 없습니다: {데이터폴더}", file=sys.stderr)
        print("desktop_version 에서 'python train.py' 를 한 번 실행하면 내려받습니다.",
              file=sys.stderr)
        return 1

    평가셋 = datasets.MNIST(str(데이터폴더), train=False, download=False)

    라벨들 = bytearray()
    이미지들 = bytearray()
    for 번호 in range(개수):
        원본, 정답 = 평가셋[번호]
        라벨들.append(정답)
        이미지들.extend(np.array(원본, dtype=np.uint8).tobytes())

    내보낼파일.parent.mkdir(parents=True, exist_ok=True)
    with open(내보낼파일, "wb") as 파일:
        파일.write(struct.pack("<I", 개수))
        파일.write(bytes(라벨들))
        파일.write(bytes(이미지들))

    크기 = 내보낼파일.stat().st_size
    print(f"{내보낼파일.name}  이미지 {개수}장, {크기:,} 바이트")
    print(f"앞쪽 라벨 20개: {list(라벨들[:20])}")
    return 0


if __name__ == "__main__":
    sys.exit(만들기())
