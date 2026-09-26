"""
MNIST 데이터셋으로 손글씨 숫자 인식 CNN을 학습하고,
학습된 가중치를 mnist_cnn.pt 파일로 저장하는 스크립트.

실행 방법:
    python train.py            (기본 5 에폭)
    python train.py --에폭 3   (에폭 수 지정)
"""

import argparse
import sys
import time
from pathlib import Path

import torch
import torch.nn.functional as F
from torch import optim
from torch.utils.data import DataLoader
from torchvision import datasets, transforms

from model import 숫자인식CNN

# 윈도우 콘솔에서 한글이 깨지지 않도록 표준 출력 인코딩을 UTF-8로 맞춘다.
try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

# 이 파일이 있는 폴더를 기준으로 경로를 잡는다.
기준폴더 = Path(__file__).resolve().parent
데이터폴더 = 기준폴더 / "data"
가중치파일 = 기준폴더 / "mnist_cnn.pt"

# MNIST 데이터셋 전체의 평균과 표준편차(널리 쓰이는 값)
평균 = 0.1307
표준편차 = 0.3081


def 데이터로더_준비(배치크기: int, 평가배치크기: int):
    """MNIST 학습용/평가용 데이터로더를 만들어 돌려준다. 데이터가 없으면 내려받는다."""
    # 학습용 변환: 약간의 회전과 이동을 주어 손글씨의 다양한 형태에 강해지도록 한다.
    학습변환 = transforms.Compose([
        transforms.RandomAffine(degrees=10, translate=(0.1, 0.1), scale=(0.9, 1.1)),
        transforms.ToTensor(),
        transforms.Normalize((평균,), (표준편차,)),
    ])
    # 평가용 변환: 증강 없이 정규화만 적용한다.
    평가변환 = transforms.Compose([
        transforms.ToTensor(),
        transforms.Normalize((평균,), (표준편차,)),
    ])

    학습데이터 = datasets.MNIST(데이터폴더, train=True, download=True, transform=학습변환)
    평가데이터 = datasets.MNIST(데이터폴더, train=False, download=True, transform=평가변환)

    학습로더 = DataLoader(학습데이터, batch_size=배치크기, shuffle=True)
    평가로더 = DataLoader(평가데이터, batch_size=평가배치크기, shuffle=False)
    return 학습로더, 평가로더


def 한_에폭_학습(모델, 장치, 학습로더, 최적화기, 에폭번호):
    """한 에폭 동안 모델을 학습시키고 평균 손실을 돌려준다."""
    모델.train()  # 드롭아웃을 켜는 학습 모드
    손실합 = 0.0
    시작시각 = time.time()

    for 배치번호, (이미지, 정답) in enumerate(학습로더, start=1):
        이미지, 정답 = 이미지.to(장치), 정답.to(장치)

        최적화기.zero_grad()            # 이전 기울기 초기화
        예측 = 모델(이미지)              # 순전파
        손실 = F.nll_loss(예측, 정답)   # 로그 소프트맥스 출력이므로 NLL 손실 사용
        손실.backward()                  # 역전파
        최적화기.step()                  # 가중치 갱신

        손실합 += 손실.item()

        # 100 배치마다 진행 상황을 출력한다.
        if 배치번호 % 100 == 0 or 배치번호 == len(학습로더):
            진행률 = 100.0 * 배치번호 / len(학습로더)
            print(f"  에폭 {에폭번호} | 배치 {배치번호:>4}/{len(학습로더)} "
                  f"({진행률:5.1f}%) | 손실 {손실.item():.4f}", flush=True)

    평균손실 = 손실합 / len(학습로더)
    걸린시간 = time.time() - 시작시각
    print(f"  -> 에폭 {에폭번호} 평균 손실 {평균손실:.4f} (소요 {걸린시간:.1f}초)", flush=True)
    return 평균손실


def 평가(모델, 장치, 평가로더):
    """평가 데이터셋에 대한 평균 손실과 정확도를 계산해 돌려준다."""
    모델.eval()  # 드롭아웃을 끄는 평가 모드
    손실합 = 0.0
    맞힌개수 = 0

    with torch.no_grad():  # 평가 시에는 기울기를 계산하지 않는다.
        for 이미지, 정답 in 평가로더:
            이미지, 정답 = 이미지.to(장치), 정답.to(장치)
            예측 = 모델(이미지)
            손실합 += F.nll_loss(예측, 정답, reduction="sum").item()
            예측숫자 = 예측.argmax(dim=1)
            맞힌개수 += (예측숫자 == 정답).sum().item()

    전체개수 = len(평가로더.dataset)
    평균손실 = 손실합 / 전체개수
    정확도 = 100.0 * 맞힌개수 / 전체개수
    print(f"  [평가] 평균 손실 {평균손실:.4f} | 정확도 {맞힌개수}/{전체개수} ({정확도:.2f}%)",
          flush=True)
    return 평균손실, 정확도


def main():
    파서 = argparse.ArgumentParser(description="MNIST 손글씨 숫자 인식 CNN 학습")
    파서.add_argument("--에폭", type=int, default=5, help="학습 에폭 수 (기본 5)")
    파서.add_argument("--배치크기", type=int, default=128, help="학습 배치 크기 (기본 128)")
    파서.add_argument("--평가배치크기", type=int, default=1000, help="평가 배치 크기 (기본 1000)")
    파서.add_argument("--학습률", type=float, default=1e-3, help="Adam 학습률 (기본 0.001)")
    파서.add_argument("--시드", type=int, default=42, help="난수 시드 (기본 42)")
    설정 = 파서.parse_args()

    # 재현성을 위해 난수 시드를 고정한다.
    torch.manual_seed(설정.시드)

    # GPU가 있으면 GPU를, 없으면 CPU를 쓴다.
    장치 = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"사용 장치: {장치}")

    print("MNIST 데이터셋 준비 중...")
    학습로더, 평가로더 = 데이터로더_준비(설정.배치크기, 설정.평가배치크기)
    print(f"학습 샘플 {len(학습로더.dataset)}개, 평가 샘플 {len(평가로더.dataset)}개\n")

    모델 = 숫자인식CNN().to(장치)
    최적화기 = optim.Adam(모델.parameters(), lr=설정.학습률)
    # 에폭이 진행될수록 학습률을 서서히 줄여 마무리 학습을 안정시킨다.
    스케줄러 = optim.lr_scheduler.StepLR(최적화기, step_size=1, gamma=0.8)

    최고정확도 = 0.0
    for 에폭번호 in range(1, 설정.에폭 + 1):
        print(f"[에폭 {에폭번호}/{설정.에폭}] 학습 시작")
        한_에폭_학습(모델, 장치, 학습로더, 최적화기, 에폭번호)
        _, 정확도 = 평가(모델, 장치, 평가로더)
        스케줄러.step()

        # 평가 정확도가 가장 좋았던 시점의 가중치를 저장한다.
        if 정확도 > 최고정확도:
            최고정확도 = 정확도
            torch.save(모델.state_dict(), 가중치파일)
            print(f"  -> 최고 정확도 갱신, 가중치를 '{가중치파일.name}'에 저장했습니다.\n",
                  flush=True)
        else:
            print("", flush=True)

    print(f"학습 완료! 최고 평가 정확도: {최고정확도:.2f}%")
    print(f"저장된 가중치 파일: {가중치파일}")


if __name__ == "__main__":
    main()
